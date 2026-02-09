import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import * as fs from 'fs';
import * as path from 'path';
const csv = require('csv-parser');

export interface CameraEventData {
  section: string;
  entity: string;
  sub_entity: string;
  metric: string;
  value: string;
  unit: string;
  extra_info: string;
  timestamp: string;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const broker = this.configService.get<string>('kafka.broker') || 'localhost:9092';
    const clientId = this.configService.get<string>('kafka.clientId') || 'vision-ops-producer';
    const connectionTimeout = this.configService.get<number>('kafka.connectionTimeout', 3000);
    const requestTimeout = this.configService.get<number>('kafka.requestTimeout', 30000);
    const retryConfig = this.configService.get<any>('kafka.retry', {
      retries: 5,
      initialRetryTime: 100,
      multiplier: 2,
    });

    this.kafka = new Kafka({
      clientId,
      brokers: broker.split(',').map((b) => b.trim()),
      connectionTimeout,
      requestTimeout,
      logLevel: 2, // WARN level - reduces verbose error logs
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      retry: {
        retries: retryConfig.retries || 5,
        initialRetryTime: retryConfig.initialRetryTime || 100,
        multiplier: retryConfig.multiplier || 2,
      },
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
      this.isConnected = false;
      return false;
    }
  }

  private async connectWithRetry() {
    const maxRetries = this.configService.get<number>('kafka.retry.retries', 5);
    const initialRetryTime = this.configService.get<number>('kafka.retry.initialRetryTime', 100);
    const multiplier = this.configService.get<number>('kafka.retry.multiplier', 2);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const connected = await this.connect();
      if (connected) {
        return;
      }

      if (attempt < maxRetries - 1) {
        const retryTime = initialRetryTime * Math.pow(multiplier, attempt);
        this.logger.warn(
          `Kafka producer connection failed. Retrying in ${retryTime}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryTime));
      }
    }

    this.logger.error(
      `Kafka producer failed to connect after ${maxRetries} attempts. Will continue retrying in background.`,
    );
    // Continue retrying in background
    setTimeout(() => this.connectWithRetry(), 10000);
  }

  private async disconnect() {
    try {
      if (this.producer && this.isConnected) {
        await this.producer.disconnect();
        this.isConnected = false;
        this.logger.log('Kafka producer disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer', error);
    }
  }

  /**
   * Ensure connection is established with retry
   */
  private async ensureConnection(maxRetries = 3): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const connected = await this.connect();
      if (connected) {
        return true;
      }

      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1); // 1s, 2s, 3s
        this.logger.warn(`Connection attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    return false;
  }

  /**
   * Produce a single message to Kafka
   */
  async produceMessage(data: CameraEventData, key?: string): Promise<void> {
    const connected = await this.ensureConnection();
    if (!connected) {
      throw new Error('Kafka producer is not connected. Please check Kafka broker availability.');
    }

    try {
      const topic = this.configService.get<string>('kafka.topics.cameraEvents') || 'visionops.camera.events.v1';
      const message = {
        topic,
        messages: [
          {
            key: key || data.entity || undefined,
            value: JSON.stringify({
              ...data,
              timestamp: data.timestamp || new Date().toISOString(),
            }),
          },
        ],
      };

      const result = await this.producer.send(message);
      this.logger.debug(`Message sent successfully - Topic: ${topic}, Partition: ${result[0].partition}, Offset: ${result[0].baseOffset}`);
    } catch (error) {
      this.logger.error('Error producing message', error);
      throw error;
    }
  }

  /**
   * Produce multiple messages to Kafka
   */
  async produceMessages(messages: Array<{ data: CameraEventData; key?: string }>): Promise<void> {
    const connected = await this.ensureConnection();
    if (!connected) {
      throw new Error('Kafka producer is not connected. Please check Kafka broker availability.');
    }

    try {
      const topic = this.configService.get<string>('kafka.topics.cameraEvents') || 'visionops.camera.events.v1';
      const kafkaMessages = messages.map(({ data, key }) => ({
        key: key || data.entity || undefined,
        value: JSON.stringify({
          ...data,
          timestamp: data.timestamp || new Date().toISOString(),
        }),
      }));

      const result = await this.producer.send({
        topic,
        messages: kafkaMessages,
      });

      this.logger.log(
        `Successfully sent ${messages.length} messages to topic: ${topic}`,
      );
      this.logger.debug(`First partition: ${result[0].partition}, Last offset: ${result[result.length - 1].baseOffset}`);
    } catch (error) {
      this.logger.error('Error producing messages', error);
      throw error;
    }
  }

  /**
   * Read CSV file and produce messages to Kafka
   */
  async produceFromCsv(csvFilePath?: string): Promise<{ success: number; failed: number }> {
    // Try to ensure connection before processing CSV
    const connected = await this.ensureConnection(5);
    if (!connected) {
      throw new Error(
        'Kafka producer is not connected. Please check Kafka broker availability and ensure the broker is accessible.',
      );
    }

    // Use provided path or default to the vision-ops.csv file
    const filePath = csvFilePath || path.join(
      process.cwd(),
      'libs',
      'common',
      'src',
      'csv',
      'vision-ops.csv',
    );

    this.logger.log(`Reading CSV file from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found at: ${filePath}`);
    }

    const messages: Array<{ data: CameraEventData; key?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    return new Promise((resolve, reject) => {
      const stream = fs
        .createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          // Skip empty rows
          if (!row.section && !row.entity) {
            return;
          }

          const eventData: CameraEventData = {
            section: row.section || '',
            entity: row.entity || '',
            sub_entity: row.sub_entity || '',
            metric: row.metric || '',
            value: row.value || '',
            unit: row.unit || '',
            extra_info: row.extra_info || '',
            timestamp: row.timestamp || new Date().toISOString(),
          };

          // Use entity as key for partitioning
          const key = eventData.entity || eventData.section;

          messages.push({ data: eventData, key });
        })
        .on('end', async () => {
          this.logger.log(`Parsed ${messages.length} rows from CSV file`);

          if (messages.length === 0) {
            this.logger.warn('No valid messages found in CSV file');
            resolve({ success: 0, failed: 0 });
            return;
          }

          try {
            // Get delay between messages from config (default 5 seconds)
            const delayMs = this.configService.get<number>('kafka.producer.delayBetweenMessages', 5000);
            
            this.logger.log(`Starting to produce ${messages.length} messages with ${delayMs}ms delay between each message`);
            
            // Send messages one at a time with delay
            for (let i = 0; i < messages.length; i++) {
              const message = messages[i];
              try {
                await this.produceMessage(message.data, message.key);
                successCount++;
                this.logger.debug(`Sent message ${i + 1}/${messages.length} - ${message.data.entity || message.data.section}`);
                
                // Wait before sending next message (except for the last one)
                if (i < messages.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
              } catch (error) {
                this.logger.error(`Failed to send message ${i + 1}/${messages.length}`, error);
                failedCount++;
                // Continue with next message even if one fails
              }
            }

            this.logger.log(
              `CSV processing completed - Success: ${successCount}, Failed: ${failedCount}`,
            );
            resolve({ success: successCount, failed: failedCount });
          } catch (error) {
            this.logger.error('Error processing CSV messages', error);
            reject(error);
          }
        })
        .on('error', (error: Error) => {
          this.logger.error('Error reading CSV file', error);
          reject(error);
        });
    });
  }

  /**
   * Produce a single event with custom data
   */
  async produceEvent(
    section: string,
    entity: string,
    data: Partial<CameraEventData>,
  ): Promise<void> {
    const eventData: CameraEventData = {
      section,
      entity,
      sub_entity: data.sub_entity || '',
      metric: data.metric || '',
      value: data.value || '',
      unit: data.unit || '',
      extra_info: data.extra_info || '',
      timestamp: data.timestamp || new Date().toISOString(),
    };

    await this.produceMessage(eventData, entity);
  }
}

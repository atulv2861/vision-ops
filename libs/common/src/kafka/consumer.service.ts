import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ElasticService } from '../elastic/elastic.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ElasticService))
    private readonly elasticService: ElasticService,
  ) {
    const broker = this.configService.get<string>('kafka.broker') || 'localhost:9092';
    const clientId = this.configService.get<string>('kafka.clientId') || 'vision-ops-consumer';
    const connectionTimeout = this.configService.get<number>('kafka.connectionTimeout', 3000);
    const requestTimeout = this.configService.get<number>('kafka.requestTimeout', 30000);

    this.kafka = new Kafka({
      clientId,
      brokers: broker.split(',').map((b) => b.trim()),
      connectionTimeout,
      requestTimeout,
      logLevel: 2, // WARN level - reduces verbose error logs
    });

    const groupId = this.configService.get<string>('kafka.groupId') || 'vision-ops-group';
    this.consumer = this.kafka.consumer({ groupId });
  }

  async onModuleInit() {
    // Connect in background, don't block application startup
    this.connectWithRetry().catch((error) => {
      this.logger.warn('Kafka consumer will retry connection in background', error.message);
    });
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer', error);
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
        await this.subscribe();
        await this.consume();
        return;
      }

      if (attempt < maxRetries - 1) {
        const retryTime = initialRetryTime * Math.pow(multiplier, attempt);
        this.logger.warn(
          `Kafka consumer connection failed. Retrying in ${retryTime}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryTime));
      }
    }

    this.logger.error(
      `Kafka consumer failed to connect after ${maxRetries} attempts. Will continue retrying in background.`,
    );
    // Continue retrying in background
    setTimeout(() => this.connectWithRetry(), 10000);
  }

  private async subscribe() {
    try {
      const topic = this.configService.get<string>('kafka.topics.cameraEvents') || 'visionops.camera.events.v1';
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error('Failed to subscribe to topic', error);
      throw error;
    }
  }

  private async consume() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting to consume messages...');

    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });
    } catch (error) {
      this.logger.error('Error consuming messages', error);
      this.isRunning = false;
    }
  }

  private async handleMessage(payload: EachMessagePayload) {
    const { topic, partition, message } = payload;
    const { offset, key, value, timestamp } = message;

    this.logger.log(
      `Received message - Topic: ${topic}, Partition: ${partition}, Offset: ${offset}`,
    );

    try {
      // Parse the message value
      const messageValue = value ? value.toString() : null;
      let parsedData: any = null;

      if (messageValue) {
        try {
          parsedData = JSON.parse(messageValue);
        } catch (parseError) {
          this.logger.warn('Failed to parse message as JSON, treating as string');
          parsedData = messageValue;
        }
      }

      // Safely convert timestamp to ISO string
      const timestampISO = this.safeTimestampToString(timestamp);

      // Log the message details
      this.logger.debug('Message details:', {
        topic,
        partition,
        offset,
        key: key ? key.toString() : null,
        timestamp: timestampISO,
        value: parsedData,
      });

      // Process the camera event
      await this.processCameraEvent(parsedData, {
        topic,
        partition,
        offset,
        key: key ? key.toString() : null,
        timestamp: timestampISO,
      });
    } catch (error) {
      this.logger.error('Error handling message', {
        error: error.message,
        topic,
        partition,
        offset,
      });
      // In production, you might want to send failed messages to a DLQ (Dead Letter Queue)
    }
  }

  /**
   * Safely convert timestamp to ISO string
   * Handles null, undefined, invalid dates, and string timestamps
   */
  private safeTimestampToString(timestamp: string | number | null | undefined): string | null {
    if (!timestamp) {
      return null;
    }

    try {
      // If it's a number (milliseconds or seconds), convert to Date
      if (typeof timestamp === 'number') {
        // Kafka timestamps are usually in milliseconds, but check if it's seconds
        const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date.toISOString();
      }

      // If it's a string, try to parse it
      if (typeof timestamp === 'string') {
        // If it's already an ISO string, return it
        if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          return timestamp;
        }
        
        // Try parsing as date
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          // If parsing fails, return current timestamp
          return new Date().toISOString();
        }
        return date.toISOString();
      }

      return null;
    } catch (error) {
      // If any error occurs, return current timestamp
      return new Date().toISOString();
    }
  }

  private async processCameraEvent(
    data: any,
    metadata: {
      topic: string;
      partition: number;
      offset: string;
      key: string | null;
      timestamp: string | null;
    },
  ) {
    this.logger.log('Processing camera event:', {
      data,
      metadata,
    });

    try {
      // Store the event in Elasticsearch (only CSV data, no Kafka metadata)
      await this.elasticService.indexDocument(data);

      this.logger.log(
        `Camera event stored in Elasticsearch successfully - Event ID: ${data.event_id || 'N/A'}, Offset: ${metadata.offset}`,
      );
    } catch (error) {
      this.logger.error(`Error storing event in Elasticsearch: ${error.message}`, {
        event_id: data.event_id,
        offset: metadata.offset,
      });
      // Don't throw - we want to continue processing even if Elasticsearch fails
    }
  }

  private async disconnect() {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.logger.log('Kafka consumer disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer', error);
    }
  }
}

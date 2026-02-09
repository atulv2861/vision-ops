import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import * as fs from 'fs';
import * as path from 'path';
const csv = require('csv-parser');

export interface CameraEventData {
  event_id: string;
  timestamp: string;
  event_type: string;
  metric_name: string;
  location: string;
  value: string;
  increment: string;
  previous_value: string;
  status: string;
  severity: string;
  camera_id: string;
  zone_id: string;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private autoProduceInterval: NodeJS.Timeout | null = null;
  private isProducing = false;

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
    // Connect in background, don't block application startup
    this.connectWithRetry().catch((error) => {
      this.logger.warn('Kafka producer will retry connection in background', error.message);
    });

    // Start automatic production every 10 seconds
    this.startAutoProduction();
  }

  async onModuleDestroy() {
    this.stopAutoProduction();
    await this.disconnect();
  }

  /**
   * Start automatic production from CSV every configured interval
   */
  private startAutoProduction() {
    const intervalMs = this.configService.get<number>('kafka.producer.autoProduceInterval', 10000); // 10 seconds default
    const enabled = this.configService.get<boolean>('kafka.producer.autoProduceEnabled', true); // Default: enabled

    if (!enabled) {
      this.logger.log('Auto-production is disabled');
      return;
    }

    this.logger.log(`Starting automatic CSV production every ${intervalMs}ms (${intervalMs / 1000} seconds)`);

    // Start immediately on first run
    this.autoProduceFromCsv().catch((error) => {
      this.logger.error('Error in initial auto-production', error);
    });

    // Then repeat every interval
    this.autoProduceInterval = setInterval(() => {
      this.autoProduceFromCsv().catch((error) => {
        this.logger.error('Error in auto-production', error);
      });
    }, intervalMs);
  }

  /**
   * Stop automatic production
   */
  private stopAutoProduction() {
    if (this.autoProduceInterval) {
      clearInterval(this.autoProduceInterval);
      this.autoProduceInterval = null;
      this.logger.log('Stopped automatic CSV production');
    }
  }

  /**
   * Auto-produce from CSV (internal method that handles errors gracefully)
   */
  private async autoProduceFromCsv() {
    // Prevent concurrent production
    if (this.isProducing) {
      this.logger.debug('Auto-production already in progress, skipping this cycle');
      return;
    }

    this.isProducing = true;
    try {
      await this.produceFromCsv();
    } catch (error) {
      // Log error but don't throw - we want to continue the interval
      this.logger.error('Auto-production failed', error);
    } finally {
      this.isProducing = false;
    }
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
            key: key || data.event_id || data.zone_id || undefined,
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
        key: key || data.event_id || data.zone_id || undefined,
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

    // Use provided path or default to the overview.csv file
    // Try multiple path resolutions
    let filePath = csvFilePath;
    if (!filePath) {
      // Try relative to process.cwd()
      const path1 = path.join(process.cwd(), 'libs', 'common', 'src', 'csv', 'overview.csv');
      // Try relative to __dirname (compiled location)
      const path2 = path.join(__dirname, '..', '..', '..', 'libs', 'common', 'src', 'csv', 'overview.csv');
      // Try absolute path from project root
      const path3 = path.resolve(process.cwd(), 'libs', 'common', 'src', 'csv', 'overview.csv');
      
      // Check which path exists
      if (fs.existsSync(path1)) {
        filePath = path1;
      } else if (fs.existsSync(path2)) {
        filePath = path2;
      } else if (fs.existsSync(path3)) {
        filePath = path3;
      } else {
        filePath = path1; // Default to first option
      }
      
      this.logger.log(`Trying CSV paths - path1: ${path1}, path2: ${path2}, path3: ${path3}`);
      this.logger.log(`Selected path: ${filePath}, exists: ${fs.existsSync(filePath)}`);
    }

    this.logger.log(`Reading CSV file from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found at: ${filePath}`);
    }

    // Verify file is readable and has content
    try {
      const stats = fs.statSync(filePath);
      this.logger.log(`File size: ${stats.size} bytes`);
      
      // Read file content to verify it's not empty
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split(/\r?\n/).filter(line => line.trim());
      this.logger.log(`File has ${lines.length} lines when read directly`);
      
      if (stats.size === 0 && lines.length === 0) {
        throw new Error(`CSV file is empty at: ${filePath}`);
      }
      
      if (lines.length === 0) {
        this.logger.warn(`File exists but has no valid lines. File size: ${stats.size} bytes`);
        // Don't throw error, let CSV parser handle it
      }
    } catch (error: any) {
      // If it's our custom error, throw it
      if (error.message && error.message.includes('CSV file is empty')) {
        throw error;
      }
      // Otherwise, log and continue - file might still be readable
      this.logger.warn('Error checking file stats, will attempt to read anyway:', error.message);
    }

    const messages: Array<{ data: CameraEventData; key?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    return new Promise((resolve, reject) => {
      let rowCount = 0;
      let hasError = false;
      
      // First, try to read file synchronously to verify it has content
      try {
        const testContent = fs.readFileSync(filePath, 'utf8');
        const testLines = testContent.split(/\r?\n/).filter(line => line.trim());
        this.logger.log(`File verification: ${testLines.length} lines found when reading synchronously`);
        
        if (testLines.length === 0) {
          this.logger.error(`CSV file is empty. File path: ${filePath}`);
          this.logger.error(`File exists: ${fs.existsSync(filePath)}`);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            this.logger.error(`File size: ${stats.size} bytes`);
          }
          // Return empty result instead of rejecting to allow app to continue
          resolve({ success: 0, failed: 0 });
          return;
        }
        
        this.logger.log(`First line preview: ${testLines[0].substring(0, 100)}`);
        this.logger.log(`Second line preview: ${testLines[1] ? testLines[1].substring(0, 100) : 'N/A'}`);
      } catch (err: any) {
        this.logger.error('Error reading file for verification:', err.message);
        this.logger.error(`File path attempted: ${filePath}`);
        // Return empty result instead of rejecting to allow app to continue
        resolve({ success: 0, failed: 0 });
        return;
      }
      
      const stream = fs
        .createReadStream(filePath, { encoding: 'utf8' })
        .on('error', (error) => {
          this.logger.error('Error reading CSV file stream:', error);
          hasError = true;
          reject(error);
        })
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: true,
          mapHeaders: ({ header }: { header: string }) => header.trim(),
        }))
        .on('error', (error: Error) => {
          this.logger.error('Error parsing CSV stream:', error);
          hasError = true;
          reject(error);
        })
        .on('data', (row: any) => {
          rowCount++;
          this.logger.log(`Processing row ${rowCount}, keys: ${Object.keys(row).join(', ')}`);
          
          // Log first row to see what we're getting
          if (rowCount === 1) {
            this.logger.log(`First row data: ${JSON.stringify(row)}`);
          }
          
          // Skip header row (csv-parser should handle this, but double-check)
          if (row.event_id === 'event_id' || row['event_id'] === 'event_id') {
            this.logger.log('Skipping header row');
            return;
          }

          // Skip completely empty rows
          const eventId = row.event_id || row['event_id'];
          const metricName = row.metric_name || row['metric_name'];
          const eventType = row.event_type || row['event_type'];
          const location = row.location || row['location'];
          
          if (!eventId && !metricName && !eventType && !location) {
            this.logger.warn(`Skipping empty row ${rowCount}`);
            return;
          }

          // Build event data - allow empty strings for optional fields
          // Handle both dot notation and bracket notation for CSV parser
          const getValue = (key: string) => {
            const val = row[key] || row[key.toLowerCase()] || '';
            return val && typeof val === 'string' ? val.trim() : (val ? val.toString().trim() : '');
          };

          const eventData: CameraEventData = {
            event_id: getValue('event_id'),
            timestamp: getValue('timestamp') || new Date().toISOString(),
            event_type: getValue('event_type'),
            metric_name: getValue('metric_name'),
            location: getValue('location'),
            value: getValue('value'),
            increment: getValue('increment'),
            previous_value: getValue('previous_value'),
            status: getValue('status'),
            severity: getValue('severity'),
            camera_id: getValue('camera_id'),
            zone_id: getValue('zone_id'),
          };

          // Use event_id or zone_id as key for partitioning
          const key = eventData.event_id || eventData.zone_id || eventData.location;

          messages.push({ data: eventData, key });
          this.logger.debug(`Parsed row: ${eventData.event_id || 'no-id'} - ${eventData.metric_name || eventData.event_type}`);
        })
        .on('end', async () => {
          this.logger.log(`CSV parsing complete - Total rows processed: ${rowCount}, Valid messages: ${messages.length}`);
          
          if (rowCount === 0) {
            this.logger.error('No rows were read from CSV file. Check file encoding and format.');
            // Try to read file directly to debug
            try {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              const lines = fileContent.split(/\r?\n/).filter(line => line.trim());
              this.logger.log(`File has ${lines.length} lines when read directly`);
              if (lines.length > 0) {
                this.logger.log(`First line: ${lines[0].substring(0, 200)}`);
                this.logger.log(`Second line: ${lines[1] ? lines[1].substring(0, 200) : 'N/A'}`);
              } else {
                this.logger.error('File appears to be empty or has no valid lines');
              }
            } catch (err) {
              this.logger.error('Error reading file directly:', err);
            }
          }

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
                this.logger.debug(`Sent message ${i + 1}/${messages.length} - ${message.data.event_id || message.data.metric_name || message.data.location}`);
                
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
    eventId: string,
    eventType: string,
    data: Partial<CameraEventData>,
  ): Promise<void> {
    const eventData: CameraEventData = {
      event_id: eventId,
      timestamp: data.timestamp || new Date().toISOString(),
      event_type: eventType,
      metric_name: data.metric_name || '',
      location: data.location || '',
      value: data.value || '',
      increment: data.increment || '',
      previous_value: data.previous_value || '',
      status: data.status || '',
      severity: data.severity || '',
      camera_id: data.camera_id || '',
      zone_id: data.zone_id || '',
    };

    await this.produceMessage(eventData, eventId);
  }
}

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsumerService, ElasticService } from '@app/common';
import { Violation, ViolationDocument } from './schemas/violation.schema';

@Injectable()
export class ViolationsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ViolationsConsumerService.name);
  private violationBuffer: any[] = [];
  private readonly BATCH_INTERVAL = 5 * 1000; // 5 seconds
  private readonly MAX_BUFFER_SIZE = 1000;
  private failedMessages: Array<{
    topic: string;
    message: string;
    error: string;
    timestamp: Date;
  }> = [];

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly elasticService: ElasticService,
    @InjectModel(Violation.name)
    private violationModel: Model<ViolationDocument>,
  ) {
    // Start batch upload scheduler immediately, independent of Kafka connection
    this.scheduleBatchUpload();
  }

  async onModuleInit() {
    // Initialize Kafka consumer in background without blocking application startup
    setImmediate(() => {
      this.initializeKafkaConsumer().catch((error) => {
        this.logger.error('Failed to initialize Kafka consumer:', error);
        this.scheduleKafkaReconnection();
      });
    });
  }

  private async initializeKafkaConsumer() {
    try {
      await this.consumerService.consume({
        topics: {
          topics: ['traffic-violations'],
          fromBeginning: true,
        },
        config: {
          groupId: 'traffic-violations-consumer',
          sessionTimeout: 45000,
          heartbeatInterval: 4000,
          rebalanceTimeout: 60000,
          allowAutoTopicCreation: true,
          retry: {
            initialRetryTime: 1000,
            retries: 8,
            maxRetryTime: 30000,
            factor: 2,
          },
        },
        onMessage: async (message: any, topic: string) => {
          try {
            const parsedMessage = JSON.parse(message.value.toString());
            if (this.violationBuffer.length < this.MAX_BUFFER_SIZE) {
              this.logger.log('Violation data received from Kafka');
              const processedViolation = this.processViolationData(parsedMessage);
              if (processedViolation) {
                this.violationBuffer.push(processedViolation);
              }
            } else {
              this.logger.warn('Buffer full, skipping message');
            }
          } catch (error) {
            this.logger.error(
              `Error processing message from topic ${topic}:`,
              error,
            );
            this.logMessageProcessingError(message, topic, error);
          }
        },
      });
      this.logger.log('Kafka consumer initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Kafka consumer:', error);
      throw error;
    }
  }

  private scheduleKafkaReconnection() {
    const MAX_RETRY_ATTEMPTS = 3;
    const MAX_DELAY_MS = 5 * 60 * 1000;
    let retryCount = 0;

    const attemptReconnect = async () => {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        this.logger.error(
          `Failed to reconnect to Kafka after ${MAX_RETRY_ATTEMPTS} attempts.`,
        );
        return;
      }

      try {
        this.logger.log(
          `Attempting to reconnect to Kafka (attempt ${retryCount + 1})`,
        );
        await this.initializeKafkaConsumer();
        retryCount = 0;
      } catch (error) {
        retryCount++;
        const delay = Math.min(Math.pow(2, retryCount) * 1000, MAX_DELAY_MS);
        this.logger.log(`Reconnection failed. Retrying in ${delay}ms...`);
        setTimeout(attemptReconnect, delay);
      }
    };

    setTimeout(attemptReconnect, 5000);
  }

  private logMessageProcessingError(message: any, topic: string, error: any) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      topic,
      messageId: message.key?.toString() || 'unknown',
      error: error.message,
      stackTrace: error.stack,
    };
    this.logger.error('Message processing error:', errorLog);
    this.storeFailedMessage(message, topic, error);
  }

  private storeFailedMessage(message: any, topic: string, error: any) {
    try {
      if (!this.failedMessages) {
        this.failedMessages = [];
      }
      this.failedMessages.push({
        topic,
        message: message.value.toString(),
        error: error.message,
        timestamp: new Date(),
      });
      if (this.failedMessages.length > 1000) {
        this.failedMessages.shift();
      }
    } catch (storeError) {
      this.logger.error('Failed to store error message:', storeError);
    }
  }

  private scheduleBatchUpload() {
    this.logger.log(`Batch upload scheduler started (interval: ${this.BATCH_INTERVAL}ms)`);
    setInterval(async () => {
      const bufferSize = this.violationBuffer.length;

      if (bufferSize === 0) {
        this.logger.debug('Buffer empty, skipping batch upload');
        return;
      }

      this.logger.log(`Starting batch upload: ${bufferSize} violations in buffer`);

      const batchData = this.violationBuffer.splice(
        0,
        this.violationBuffer.length,
      );

      try {
        const result = await this.violationModel.insertMany(batchData, {
          ordered: false,
        });
        this.logger.log(
          `✓ Batch uploaded: ${result.length} violations saved to MongoDB`,
        );

        // Index to Elasticsearch
        const esDocuments = result.map((doc: any) => ({
          id: doc.id || doc._id.toString(),
          doc: {
            id: doc.id,
            timestamp: doc.timestamp,
            date: doc.date,
            hour: doc.hour,
            dayOfWeek: doc.dayOfWeek,
            violationType: doc.violationType,
            location: doc.location,
            severity: doc.severity,
            licensePlate: doc.licensePlate,
            cameraId: doc.cameraId,
            status: doc.status ?? 'valid',
          },
        }));
        await this.elasticService.bulkIndex('traffic_violations', esDocuments);
      } catch (error) {
        this.logger.error('✗ Error uploading violation batch to MongoDB:', error.message);
        this.logger.error('Error details:', error);
        // Re-add failed items to buffer (with max size check)
        if (this.violationBuffer.length + batchData.length < this.MAX_BUFFER_SIZE) {
          this.violationBuffer.push(...batchData.slice(0, 100)); // Add back limited items
        }
      }
    }, this.BATCH_INTERVAL);
  }

  private processViolationData(data: any): any {
    try {
      const statuses = ['valid', 'unresolved', 'false_positive', 'acknowledged'];
      const status = data.status && statuses.includes(data.status) ? data.status : 'valid';
      return {
        id: data.id,
        timestamp: data.timestamp,
        date: data.date,
        hour: data.hour,
        dayOfWeek: data.dayOfWeek,
        violationType: data.violationType,
        location: data.location,
        severity: data.severity,
        licensePlate: data.licensePlate,
        cameraId: data.cameraId,
        status,
      };
    } catch (error) {
      this.logger.error('Error processing violation data:', error);
      return null;
    }
  }

  getFailedMessages() {
    return this.failedMessages;
  }
}

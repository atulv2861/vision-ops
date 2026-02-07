import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning = false;

  constructor(private readonly configService: ConfigService) {
    const broker = this.configService.get<string>('kafka.broker');
    const clientId = this.configService.get<string>('kafka.clientId');

    this.kafka = new Kafka({
      clientId,
      brokers: broker.split(',').map((b) => b.trim()),
    });

    const groupId = this.configService.get<string>('kafka.groupId');
    this.consumer = this.kafka.consumer({ groupId });
  }

  async onModuleInit() {
    await this.connect();
    await this.subscribe();
    await this.consume();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer', error);
      throw error;
    }
  }

  private async subscribe() {
    try {
      const topic = this.configService.get<string>('kafka.topics.cameraEvents');
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

      // Log the message details
      this.logger.debug('Message details:', {
        topic,
        partition,
        offset,
        key: key ? key.toString() : null,
        timestamp: timestamp ? new Date(timestamp).toISOString() : null,
        value: parsedData,
      });

      // Process the camera event
      await this.processCameraEvent(parsedData, {
        topic,
        partition,
        offset,
        key: key ? key.toString() : null,
        timestamp: timestamp ? new Date(timestamp).toISOString() : null,
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

    // TODO: Implement your business logic here
    // For example:
    // - Store the event in a database
    // - Trigger other services
    // - Process the camera event data
    // - Send notifications
    // etc.

    // Example: Log the processed event
    this.logger.log(`Camera event processed successfully - Offset: ${metadata.offset}`);
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

import {
  Consumer,
  ConsumerConfig,
  ConsumerSubscribeTopics,
  Kafka,
  KafkaMessage,
} from 'kafkajs';
import { Logger } from '@nestjs/common';
import { IConsumer } from './consumer.interface';
import { sleep } from '../utils/sleep';

export class KafkajsConsumer implements IConsumer {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly logger: Logger;

  constructor(
    private readonly topics: ConsumerSubscribeTopics,
    config: ConsumerConfig,
    broker: string,
  ) {
    this.kafka = new Kafka({
      brokers: broker.split(',').map((b) => b.trim()),
      connectionTimeout: 3000,
      requestTimeout: 30000,
    });
    this.consumer = this.kafka.consumer(config);
    this.logger = new Logger(
      `KafkaConsumer-${Array.isArray(topics.topics) ? topics.topics.join(',') : topics.topics}`,
    );
  }

  async consume(onMessage: (message: KafkaMessage, topic: string) => Promise<void>) {
    await this.consumer.subscribe(this.topics);
    await this.consumer.run({
      eachMessage: async ({ message, partition, topic }) => {
        this.logger.debug(`Processing message partition: ${partition}`);
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await onMessage(message, topic);
            return;
          } catch (err) {
            this.logger.warn(
              `Error consuming message, retry ${attempt}/${maxRetries}: ${err?.message ?? err}`,
            );
            if (attempt === maxRetries) {
              this.logger.error('Error consuming message. Consider DLQ.', err);
              await this.addMessageToDlq(message);
            }
          }
        }
      },
    });
  }

  private async addMessageToDlq(_message: KafkaMessage) {
    this.logger.warn('Message would be added to DLQ (not implemented)');
  }

  async connect() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');
    } catch (err) {
      this.logger.error('Failed to connect to Kafka.', err);
      await sleep(5000);
      await this.connect();
    }
  }

  async disconnect() {
    await this.consumer.disconnect();
    this.logger.log('Kafka consumer disconnected');
  }
}

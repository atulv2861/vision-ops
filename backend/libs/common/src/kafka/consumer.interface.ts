import { KafkaMessage } from 'kafkajs';

export interface IConsumer {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  consume: (onMessage: (message: KafkaMessage, topic: string) => Promise<void>) => Promise<void>;
}

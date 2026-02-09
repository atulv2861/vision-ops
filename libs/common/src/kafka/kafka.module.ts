import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './consumer.service';
import { KafkaProducerService } from './producer.service';

@Module({
  providers: [KafkaConsumerService, KafkaProducerService],
  exports: [KafkaConsumerService, KafkaProducerService],
})
export class KafkaModule {}

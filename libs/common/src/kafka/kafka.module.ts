import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './consumer.service';
import { KafkaProducerService } from './producer.service';
import { ElasticModule } from '../elastic';

@Module({
  imports: [ElasticModule],
  providers: [KafkaConsumerService, KafkaProducerService],
  exports: [KafkaConsumerService, KafkaProducerService],
})
export class KafkaModule {}

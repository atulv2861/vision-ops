import { Module } from '@nestjs/common';
import { ElasticModule } from '../elastic';
import { EnrichmentModule } from '../enrichment';
import { KafkaConsumerService } from './consumer.service';
import { KafkaProducerService } from './producer.service';

@Module({
  imports: [ElasticModule, EnrichmentModule],
  providers: [KafkaConsumerService, KafkaProducerService],
  exports: [KafkaConsumerService, KafkaProducerService],
})
export class KafkaModule {}

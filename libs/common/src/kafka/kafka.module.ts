import { Module } from '@nestjs/common';
import { ElasticModule } from '../elastic';
import { EnrichmentModule } from '../enrichment';
import { MongoModule } from '../mongo';
import { KafkaConsumerService } from './consumer.service';
import { KafkaProducerService } from './producer.service';

@Module({
  imports: [ElasticModule, EnrichmentModule, MongoModule],
  providers: [KafkaConsumerService, KafkaProducerService],
  exports: [KafkaConsumerService, KafkaProducerService],
})
export class KafkaModule { }

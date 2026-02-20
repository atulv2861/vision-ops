import { Global, Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';

@Global()
@Module({
  providers: [ConsumerService],
  exports: [ConsumerService],
})
export class KafkaModule {}

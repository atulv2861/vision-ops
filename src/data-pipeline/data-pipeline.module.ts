import { Module } from '@nestjs/common';
import { DataPipelineController } from './data-pipeline.controller';
import { DataPipelineService } from './data-pipeline.service';
import { GatewayGateway } from './gateway/gateway.gateway';
import { ElasticModule, KafkaModule } from '../../libs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ElasticModule, KafkaModule, ScheduleModule.forRoot()],
  controllers: [DataPipelineController],
  providers: [DataPipelineService, GatewayGateway]
})
export class DataPipelineModule { }

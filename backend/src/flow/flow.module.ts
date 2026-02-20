import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlowZone, FlowZoneSchema } from './schemas/flow-zone.schema';
import { FlowAlert, FlowAlertSchema } from './schemas/flow-alert.schema';
import { CongestionTimeseries, CongestionTimeseriesSchema } from './schemas/congestion-timeseries.schema';
import { FlowConsumerService } from './flow-consumer.service';
import { FlowService } from './flow.service';
import { FlowController } from './flow.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FlowZone.name, schema: FlowZoneSchema },
      { name: FlowAlert.name, schema: FlowAlertSchema },
      { name: CongestionTimeseries.name, schema: CongestionTimeseriesSchema },
    ]),
  ],
  controllers: [FlowController],
  providers: [FlowConsumerService, FlowService],
  exports: [FlowService],
})
export class FlowModule { }

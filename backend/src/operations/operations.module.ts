import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Journey, JourneySchema } from './schemas/journey.schema';
import { Violation, ViolationSchema } from '../violations/schemas/violation.schema';
import { Camera, CameraSchema } from '../reference/schemas/camera.schema';
import { OperationsConsumerService } from './operations-consumer.service';
import { OperationsService } from './operations.service';
import { OperationsController } from './operations.controller';
import { VehicleConfigModule } from '../vehicle-config/vehicle-config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Journey.name, schema: JourneySchema },
      { name: Violation.name, schema: ViolationSchema },
      { name: Camera.name, schema: CameraSchema },
    ]),
    VehicleConfigModule,
  ],
  controllers: [OperationsController],
  providers: [OperationsConsumerService, OperationsService],
})
export class OperationsModule { }

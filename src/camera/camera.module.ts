import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';
import { CameraConsumerService } from './camera-consumer.service';
import { CameraStatus, CameraStatusSchema } from './schemas/camera-status.schema';
import { EnrichmentModule, ElasticModule } from '../../libs/common';

@Module({
  imports: [
    EnrichmentModule,
    ElasticModule,
    MongooseModule.forFeature([
      { name: CameraStatus.name, schema: CameraStatusSchema },
    ]),
  ],
  controllers: [CameraController],
  providers: [CameraService, CameraConsumerService],
  exports: [CameraService],
})
export class CameraModule {}

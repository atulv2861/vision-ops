import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsumerService } from '@app/common';
import { Camera, CameraSchema } from './schemas/camera.schema';
import { Zone, ZoneSchema } from './schemas/zone.schema';
import { Bottleneck, BottleneckSchema } from './schemas/bottleneck.schema';
import { ReferenceConsumerService } from './reference-consumer.service';
import { ReferenceService } from './reference.service';
import { ReferenceController } from './reference.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Camera.name, schema: CameraSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Bottleneck.name, schema: BottleneckSchema },
    ]),
  ],
  controllers: [ReferenceController],
  providers: [ReferenceConsumerService, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}

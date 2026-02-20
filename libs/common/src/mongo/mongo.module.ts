import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoService } from './mongo.service';
import { CameraEvent, CameraEventSchema } from './camera-event.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: CameraEvent.name, schema: CameraEventSchema }]),
    ],
    providers: [MongoService],
    exports: [MongoService],
})
export class MongoModule { }

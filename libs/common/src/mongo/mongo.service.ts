import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CameraEvent, CameraEventDocument } from './camera-event.schema';

@Injectable()
export class MongoService {
    private readonly logger = new Logger(MongoService.name);

    constructor(
        @InjectModel(CameraEvent.name) private cameraEventModel: Model<CameraEventDocument>,
    ) { }

    /**
     * Index a single camera occupancy document into MongoDB
     */
    async saveCameraEvent(document: any): Promise<void> {
        try {
            const newEvent = new this.cameraEventModel(document);
            await newEvent.save();
            this.logger.debug(`💾 Raw Event Saved to MongoDB - camera_id: ${document.camera_id}`);
        } catch (error) {
            this.logger.error(`Error saving camera document to MongoDB: ${error.message}`, error);
            throw error;
        }
    }
}

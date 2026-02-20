import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Camera, CameraDocument } from './schemas/camera.schema';
import { Zone, ZoneDocument } from './schemas/zone.schema';
import { Bottleneck, BottleneckDocument } from './schemas/bottleneck.schema';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Bottleneck.name) private bottleneckModel: Model<BottleneckDocument>,
  ) {}

  async getCameras() {
    return this.cameraModel.find().sort({ cameraId: 1 }).lean().exec();
  }

  async getZones() {
    return this.zoneModel.find().sort({ zoneId: 1 }).lean().exec();
  }

  async getBottlenecks() {
    return this.bottleneckModel.find().lean().exec();
  }
}

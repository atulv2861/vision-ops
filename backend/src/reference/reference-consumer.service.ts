import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsumerService, ElasticService } from '@app/common';
import { Camera, CameraDocument } from './schemas/camera.schema';
import { Zone, ZoneDocument } from './schemas/zone.schema';
import { Bottleneck, BottleneckDocument } from './schemas/bottleneck.schema';

@Injectable()
export class ReferenceConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ReferenceConsumerService.name);

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly elasticService: ElasticService,
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Bottleneck.name) private bottleneckModel: Model<BottleneckDocument>,
  ) { }

  async onModuleInit() {
    // Initialize Kafka consumer in background without blocking application startup
    setImmediate(() => {
      this.consumerService.consume({
        topics: { topics: ['traffic-reference'], fromBeginning: true },
        config: {
          groupId: 'traffic-reference-consumer',
          sessionTimeout: 45000,
          heartbeatInterval: 4000,
          allowAutoTopicCreation: true,
          retry: { initialRetryTime: 1000, retries: 5, maxRetryTime: 30000, factor: 2 },
        },
        onMessage: async (message: any, topic: string) => {
          try {
            const payload = JSON.parse(message.value.toString());
            // Support both 'type' and 'messageType' for routing
            const messageType = payload.messageType || payload.type;

            if (messageType === 'camera') {
              delete payload.type; // Remove routing type for cameras
              delete payload.messageType; // Remove messageType if present
              await this.cameraModel.findOneAndUpdate(
                { cameraId: payload.cameraId },
                { $set: payload },
                { upsert: true, new: true },
              );
              this.logger.debug(`Upserted camera ${payload.cameraId}`);

              // Index to Elasticsearch
              await this.elasticService.indexDocument(
                'traffic_cameras',
                payload.cameraId,
                payload,
              );
            } else if (messageType === 'zone') {
              // Keep payload.type - it contains zone type (Urban/Transit)
              delete payload.messageType; // Remove only the routing field
              await this.zoneModel.findOneAndUpdate(
                { zoneId: payload.zoneId },
                { $set: payload },
                { upsert: true, new: true },
              );
              this.logger.debug(`Upserted zone ${payload.zoneId}`);

              // Index to Elasticsearch
              await this.elasticService.indexDocument(
                'traffic_zones',
                payload.zoneId,
                payload,
              );
            }
            // Note: Bottleneck handling removed - calculated dynamically from journey data
          } catch (error) {
            this.logger.error(`Error processing reference message: ${error?.message}`, error?.stack);
          }
        },
      }).then(() => {
        this.logger.log('Reference consumer initialized successfully');
      }).catch((error) => {
        this.logger.error('Failed to initialize reference consumer:', error?.message);
      });
    });
  }
}

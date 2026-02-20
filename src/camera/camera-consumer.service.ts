import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConsumerService, CameraDetailsService, ElasticService, timestampSameFormatFallback } from '../../libs/common';
import { CameraStatus, CameraStatusDocument } from './schemas/camera-status.schema';

@Injectable()
export class CameraConsumerService implements OnModuleInit {
  private readonly logger = new Logger(CameraConsumerService.name);

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly configService: ConfigService,
    private readonly cameraDetailsService: CameraDetailsService,
    private readonly elasticService: ElasticService,
    @InjectModel(CameraStatus.name) private readonly cameraStatusModel: Model<CameraStatusDocument>,
  ) {}

  async onModuleInit() {
    setImmediate(() => {
      this.initializeConsumer().catch((error) => {
        this.logger.error('Failed to initialize camera_status consumer:', error);
        this.scheduleReconnection();
      });
    });
  }

  private async initializeConsumer() {
    const broker = this.configService.get<string>('kafka.broker');
    if (!broker) {
      this.logger.warn('kafka.broker not configured, skipping camera_status consumer');
      return;
    }

    const cameraStatusTopic =
      this.configService.get<string>('kafka.topics.cameraStatus') || 'camera_status';
    const baseGroupId = this.configService.get<string>('kafka.groupId') || 'vision-ops-group';

    await this.consumerService.consume({
      topics: { topics: [cameraStatusTopic], fromBeginning: false },
      config: {
        groupId: `${baseGroupId}-camera-status`,
        sessionTimeout: 45000,
        heartbeatInterval: 4000,
        allowAutoTopicCreation: true,
      },
      onMessage: async (message) => {
        try {
          const value = message.value?.toString();
          const parsed = value ? (JSON.parse(value) as Record<string, unknown>) : null;
          if (!parsed) return;

          const camera_id =
            (parsed?.camera_id as string) ?? (parsed?.cameraId as string) ?? (parsed?.sencer_id as string) ?? '';
          let details = null;
          if (camera_id) {
            details = await this.cameraDetailsService.getByCameraId(camera_id);
          }
          const enriched = details
            ? { ...parsed, camera_details: details }
            : parsed;

          
          const _id = new Types.ObjectId();
          const toStore = {
            client_id: (enriched.client_id as string) ?? (enriched.cliend_id as string) ?? '',
            name: (enriched.name as string) ?? '',
            location_id: (enriched.location_id as string) ?? '',
            location: (enriched.location as string) ?? '',
            camera_id: camera_id,
            timestamp: ((enriched.timestamp as string) ?? '')?.trim() || timestampSameFormatFallback(),
            camera_status: (enriched.camera_status as number) ?? 0,
            ...(details && { camera_details: details }),
          };
          await this.cameraStatusModel.create({ _id, ...toStore });
          await this.elasticService.indexCameraStatusDocument({ _id: _id.toString(), ...toStore });
          this.logger.log(`[camera_status] stored Mongo+ES: ${JSON.stringify(enriched)}`);
        } catch (error) {
          this.logger.error(`Error processing camera_status message: ${error?.message}`);
        }
      },
    });
    this.logger.log(`Subscribed to topic: ${cameraStatusTopic}`);
  }

  private scheduleReconnection() {
    this.logger.log('Scheduling camera_status consumer reconnection in 5s...');
    setTimeout(
      () => this.initializeConsumer().catch(() => this.scheduleReconnection()),
      5000,
    );
  }
}

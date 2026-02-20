import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConsumerService, CameraDetailsService, ElasticService, timestampSameFormatFallback } from '../../libs/common';
import { PeopleDistribution, PeopleDistributionDocument } from './schemas/people-distribution.schema';

@Injectable()
export class OverviewConsumerService implements OnModuleInit {
  private readonly logger = new Logger(OverviewConsumerService.name);

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly configService: ConfigService,
    private readonly cameraDetailsService: CameraDetailsService,
    private readonly elasticService: ElasticService,
    @InjectModel(PeopleDistribution.name)
    private readonly peopleDistributionModel: Model<PeopleDistributionDocument>,
  ) {}

  async onModuleInit() {
    setImmediate(() => {
      this.initializeConsumers().catch((error) => {
        this.logger.error('Failed to initialize Kafka consumers:', error);
        this.scheduleReconnection();
      });
    });
  }

  private async initializeConsumers() {
    const broker = this.configService.get<string>('kafka.broker');
    if (!broker) {
      this.logger.warn('kafka.broker not configured, skipping overview consumers');
      return;
    }

    const peopleDistributionTopic =
      this.configService.get<string>('kafka.topics.peopleDistribution') || 'people_distribution';
    const baseGroupId = this.configService.get<string>('kafka.groupId') || 'vision-ops-group';

    await this.consumerService.consume({
      topics: { topics: [peopleDistributionTopic], fromBeginning: false },
      config: {
        groupId: `${baseGroupId}-people-distribution`,
        sessionTimeout: 45000,
        heartbeatInterval: 4000,
        allowAutoTopicCreation: true,
      },
      onMessage: async (message) => {
        try {
          const value = message.value?.toString();
          const parsed = value ? (JSON.parse(value) as Record<string, unknown>) : null;
          if (!parsed) return;
          this.logger.log(`[people_distribution] ${JSON.stringify(parsed)}`);
          const camera_id = String(
            parsed?.camera_id ?? parsed?.cameraId ?? parsed?.sencer_id ?? parsed?.sensor_id ?? parsed?.device_id ?? '',
          ).trim();
          let details = null;
          if (camera_id) {
            details = await this.cameraDetailsService.getByCameraId(camera_id);
          }
          const enriched = details
            ? { ...parsed, camera_details: details }
            : parsed;

          const resolvedCameraId = String(
            enriched.camera_id ?? enriched.cameraId ?? enriched.sensor_id ?? enriched.sensor_id ?? enriched.device_id ?? camera_id ?? '',
          ).trim();
          if (!resolvedCameraId) {
            this.logger.warn('[people_distribution] skipping: missing camera_id');
            return;
          }
          const _id = new Types.ObjectId();
          const toStore = {
            client_id: (enriched.client_id as string) ?? '',
            camera_id: resolvedCameraId,
            name: (enriched.name as string) ?? '',
            timestamp: ((enriched.timestamp as string) ?? '')?.trim() || timestampSameFormatFallback(),
            location: (enriched.location as string) ?? '',
            location_id: (enriched.location_id as string) ?? '',
            occupancy_capacity: (enriched.occupancy_capacity as number) ?? 0,
            total_person: (enriched.total_person as number) ?? 0,
            avg_dwell_time: enriched.avg_dwell_time as number | undefined,
            person_data: Array.isArray(enriched.person_data)
              ? (enriched.person_data as Array<{ person_id: string; person_type: string; dwell_time: number }>)
              : [],
            unique_person: (enriched.unique_person as number) ?? 0,
            ...(details && { camera_details: details }),
          };
          await this.peopleDistributionModel.create({ _id, ...toStore });
          await this.elasticService.indexPeopleDistributionDocument({ _id: _id.toString(), ...toStore });
          this.logger.log(`[people_distribution] stored Mongo+ES: camera_id=${toStore.camera_id}`);
        } catch (error) {
          this.logger.error(`Error processing people_distribution message: ${error?.message}`);
        }
      },
    });
    this.logger.log(`Subscribed to topic: ${peopleDistributionTopic}`);
  }

  private scheduleReconnection() {
    this.logger.log('Scheduling Kafka reconnection in 5s...');
    setTimeout(() => this.initializeConsumers().catch(() => this.scheduleReconnection()), 5000);
  }
}

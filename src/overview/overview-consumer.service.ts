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
  ) { }

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
            parsed?.camera_id ?? parsed?.sensor_id ?? '',
          ).trim();
          let details = null;
          if (camera_id) {
            this.logger.log('====================================60', camera_id)
            details = await this.cameraDetailsService.getByCameraId(camera_id);
            this.logger.log('====================================61', details)
          }
          this.logger.log('====================================62', details)

          // calculate the avg_dwell_time






          const latestStats = await this.elasticService.getLatestCameraStats(camera_id);
          const previous_avg_dwell_time = latestStats.previous_avg_dwell_time || 0;
          const previous_total_person = latestStats.previous_total_person || 0;
          const person_data = Array.isArray(parsed.person_data) ? (parsed.person_data as Array<{ person_id: string; person_type: string; dwell_time: number }>) : [];
          const new_dwell_sum = person_data.reduce((sum, p) => sum + (Number(p.dwell_time) || 0), 0);
          const new_unique_person_count = Number(parsed.unique_person) || 0;
          
          const avg_dwell_time= ((previous_total_person * previous_avg_dwell_time) + new_dwell_sum) / (previous_total_person + new_unique_person_count)
          
          const _id = new Types.ObjectId().toString();
          const mongo_data = {
            client_id: details?.client_id ?? '',
            camera_id: camera_id,
            timestamp: ((parsed.timestamp as string) ?? '')?.trim() || timestampSameFormatFallback(),
            occupancy_capacity: (parsed.occupancy_capacity as number) ?? 0,
            total_person: (parsed.total_person as number) ?? 0,
            avg_dwell_time: avg_dwell_time as number | undefined,
            person_data: Array.isArray(parsed.person_data)
              ? (parsed.person_data as Array<{ person_id: string; person_type: string; dwell_time: number }>)
              : [],
            unique_person: (parsed.unique_person as number) ?? 0,
          };

          const elastic_data = {
            client_id: details?.client_id ?? '',
            camera_id: camera_id,
            name: details?.name ?? '',
            timestamp: ((parsed.timestamp as string) ?? '')?.trim() || timestampSameFormatFallback(),
            location: details?.location ?? '',
            location_id: details?.location_id ?? '',
            occupancy_capacity: (parsed.occupancy_capacity as number) ?? 0,
            total_person: (parsed.total_person as number) ?? 0,
            avg_dwell_time:avg_dwell_time as number | undefined,
            person_data: Array.isArray(parsed.person_data)
              ? (parsed.person_data as Array<{ person_id: string; person_type: string; dwell_time: number }>)
              : [],
            unique_person: (parsed.unique_person as number) ?? 0,
          };
          //this.logger.log('====================================89', toStore)
          await this.peopleDistributionModel.create({ _id, ...mongo_data });
          await this.elasticService.indexPeopleDistributionDocument({ _id: _id, ...elastic_data });
          this.logger.log(`[people_distribution] stored Mongo+ES: camera_id=${mongo_data.camera_id}`);
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
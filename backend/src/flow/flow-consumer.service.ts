import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsumerService, ElasticService } from '@app/common';
import { FlowZone, FlowZoneDocument } from './schemas/flow-zone.schema';
import { FlowAlert, FlowAlertDocument } from './schemas/flow-alert.schema';
import { CongestionTimeseries, CongestionTimeseriesDocument } from './schemas/congestion-timeseries.schema';

@Injectable()
export class FlowConsumerService implements OnModuleInit {
  private readonly logger = new Logger(FlowConsumerService.name);

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly elasticService: ElasticService,
    @InjectModel(FlowZone.name) private flowZoneModel: Model<FlowZoneDocument>,
    @InjectModel(FlowAlert.name) private flowAlertModel: Model<FlowAlertDocument>,
    @InjectModel(CongestionTimeseries.name) private congestionModel: Model<CongestionTimeseriesDocument>,
  ) { }

  async onModuleInit() {
    // Initialize Kafka consumer in background without blocking application startup
    setImmediate(() => {
      this.consumerService.consume({
        topics: { topics: ['traffic-flow'], fromBeginning: true },
        config: {
          groupId: 'traffic-flow-consumer',
          sessionTimeout: 45000,
          heartbeatInterval: 4000,
          allowAutoTopicCreation: true,
          retry: { initialRetryTime: 1000, retries: 5, maxRetryTime: 30000, factor: 2 },
        },
        onMessage: async (message: any) => {
          try {
            const payload = JSON.parse(message.value.toString());
            const recordType = payload.recordType;

            if (!recordType) {
              this.logger.warn('Message missing recordType field');
              return;
            }

            // Remove recordType from payload before saving
            delete payload.recordType;

            if (recordType === 'zone') {
              await this.flowZoneModel.findOneAndUpdate(
                { zoneName: payload.zoneName },
                { $set: payload },
                { upsert: true, new: true },
              );
              this.logger.debug(`Upserted flow zone: ${payload.zoneName}`);

              // Index to Elasticsearch
              await this.elasticService.indexDocument(
                'traffic_flow_zones',
                payload.zoneName,
                payload,
              );
            } else if (recordType === 'alert') {
              await this.flowAlertModel.findOneAndUpdate(
                { name: payload.name },
                { $set: payload },
                { upsert: true, new: true },
              );
              this.logger.debug(`Upserted flow alert: ${payload.name}`);

              // Index to Elasticsearch
              await this.elasticService.indexDocument(
                'traffic_flow_alerts',
                payload.name,
                payload,
              );
            } else if (recordType === 'congestion') {
              await this.congestionModel.findOneAndUpdate(
                { name: payload.name },
                { $set: payload },
                { upsert: true, new: true },
              );
              this.logger.debug(`Upserted congestion timeseries: ${payload.name}`);

              // Index to Elasticsearch
              await this.elasticService.indexDocument(
                'traffic_congestion',
                payload.name,
                payload,
              );
            } else if (recordType === 'queue' || recordType === 'vehicle_type') {
              // Skip queue and vehicle_type - not storing in DB
              this.logger.debug(`Skipping recordType: ${recordType} (not stored)`);
            } else {
              this.logger.warn(`Unknown recordType: ${recordType}`);
            }
          } catch (error) {
            this.logger.error(`Error processing flow message: ${error?.message}`, error?.stack);
          }
        },
      }).then(() => {
        this.logger.log('Flow consumer initialized successfully');
      }).catch((error) => {
        this.logger.error('Failed to initialize flow consumer:', error?.message);
      });
    });
  }
}

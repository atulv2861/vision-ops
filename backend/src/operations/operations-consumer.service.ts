import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsumerService, ElasticService } from '@app/common';
import { Journey, JourneyDocument } from './schemas/journey.schema';

@Injectable()
export class OperationsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(OperationsConsumerService.name);

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly elasticService: ElasticService,
    @InjectModel(Journey.name) private journeyModel: Model<JourneyDocument>,
  ) { }

  async onModuleInit() {
    // Initialize Kafka consumer in background without blocking application startup
    setImmediate(() => {
      this.consumerService.consume({
        topics: { topics: ['traffic-operations'], fromBeginning: true },
        config: {
          groupId: 'traffic-operations-consumer',
          sessionTimeout: 45000,
          heartbeatInterval: 4000,
          allowAutoTopicCreation: true,
          retry: { initialRetryTime: 1000, retries: 5, maxRetryTime: 30000, factor: 2 },
        },
        onMessage: async (message: any) => {
          try {
            const payload = JSON.parse(message.value.toString());

            // Use composite key: journeyId + type + cameraId for unique detection
            const uniqueKey = {
              journeyId: payload.journeyId,
              type: payload.type,
              cameraId: payload.cameraId,
            };

            await this.journeyModel.findOneAndUpdate(
              uniqueKey,
              { $set: payload },
              { upsert: true, new: true },
            );
            this.logger.debug(`Upserted journey detection: ${payload.journeyId} - ${payload.type} at ${payload.cameraId}`);

            // Index to Elasticsearch with unique ID
            const docId = `${payload.journeyId}_${payload.type}_${payload.cameraId}`;
            await this.elasticService.indexDocument(
              'traffic_journeys',
              docId,
              payload,
            );
          } catch (error) {
            this.logger.error(`Error processing operations message: ${error?.message}`, error?.stack);
          }
        },
      }).then(() => {
        this.logger.log('Operations consumer initialized successfully');
      }).catch((error) => {
        this.logger.error('Failed to initialize operations consumer:', error?.message);
      });
    });
  }
}

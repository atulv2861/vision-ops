import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ElasticService } from '../../libs/common';
import { GatewayGateway } from './gateway/gateway.gateway';

@Injectable()
export class DataPipelineService {
    private readonly logger = new Logger(DataPipelineService.name);

    constructor(
        private readonly elasticService: ElasticService,
        private readonly websocketGateway: GatewayGateway
    ) { }

    @Cron('*/10 * * * * *') // Run every 10 seconds for real-time dashboard updates
    async handleDataAggregation() {
        try {
            this.logger.debug('📊 Aggregation Running...');

            const client = this.elasticService.getClient();
            const cameraIndex = this.elasticService.getCameraIndexName();

            // Check if camera index exists
            const exists = await client.indices.exists({ index: cameraIndex });
            if (!exists) {
                this.logger.warn(`Index ${cameraIndex} does not exist yet. Skipping aggregation.`);
                return;
            }

            // Query: Get the very latest document for each camera up to the last 5 minutes
            const result = await client.search({
                index: cameraIndex,
                size: 0,
                body: {
                    query: {
                        range: {
                            timestamp: {
                                gte: 'now-5m',
                                lt: 'now'
                            }
                        }
                    },
                    aggs: {
                        cameras: {
                            terms: { field: 'camera_id', size: 100 },
                            aggs: {
                                latest: {
                                    top_hits: {
                                        sort: [{ timestamp: { order: 'desc' } }],
                                        size: 1
                                    }
                                }
                            }
                        }
                    }
                }
            });

            let current_occupancy = 0;
            let total_entries = 0; // If explicit entries/exits aren't tracked, we can estimate or leave as 0
            let total_exits = 0;

            const buckets = (result.aggregations?.cameras as any)?.buckets || [];
            const cameraBreakdown = [];

            for (const bucket of buckets) {
                const latestDocHit = bucket.latest?.hits?.hits[0];
                if (latestDocHit && latestDocHit._source) {
                    const doc = latestDocHit._source;
                    const occupancy = Number(doc.total_person) || 0;
                    current_occupancy += occupancy;

                    cameraBreakdown.push({
                        camera_id: doc.camera_id,
                        location: doc.location_id || doc.location,
                        occupancy
                    });
                }
            }

            const aggregatedPayload = {
                timestamp: new Date().toISOString(),
                current_occupancy,
                total_entries,
                total_exits,
                active_cameras: buckets.length,
                camera_breakdown: cameraBreakdown
            };

            this.logger.log(`📊 Aggregated Result: { current_occupancy: ${current_occupancy} }`);

            // 1. Broadcast to WebSocket clients
            this.logger.log(`📡 Emitting via WebSocket`);
            this.websocketGateway.server.emit('aggregatedMetrics', aggregatedPayload);

            // 2. Save to Elastic (DB Save)
            await this.elasticService.indexAggregatedDocument({
                timestamp: aggregatedPayload.timestamp,
                current_occupancy: aggregatedPayload.current_occupancy,
                total_entries: aggregatedPayload.total_entries,
                total_exits: aggregatedPayload.total_exits,
            });

        } catch (error) {
            this.logger.error(`Error during aggregation task: ${error.message}`, error.stack);
        }
    }
}


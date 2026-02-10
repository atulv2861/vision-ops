import { Injectable, Logger } from '@nestjs/common';
import { ElasticService } from '../../libs/common/src/elastic/elastic.service';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);
    private readonly INDEX_NAME = 'events-data';

    constructor(private readonly elasticService: ElasticService) { }

    async ingestEvents(documents: any[]) {
        if (documents.length > 0) {
            const client = this.elasticService.getClient();

            // Check/Create index with mappings
            const exists = await client.indices.exists({ index: this.INDEX_NAME });
            if (!exists) {
                await client.indices.create({
                    index: this.INDEX_NAME,
                    mappings: {
                        properties: {
                            event_id: { type: 'keyword' },
                            event_type: { type: 'keyword' },
                            title: { type: 'text' },
                            description: { type: 'text' },
                            category: { type: 'keyword' },
                            severity: { type: 'keyword' },
                            status: { type: 'keyword' },
                            location: { type: 'keyword' },
                            building: { type: 'keyword' },
                            floor: { type: 'keyword' },
                            camera_id: { type: 'keyword' },
                            timestamp: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis' },
                            confidence: { type: 'keyword' },
                            ai_confidence: { type: 'keyword' },
                            thumbnail_url: { type: 'keyword' },
                            video_url: { type: 'keyword' },
                            timeline_event: { type: 'keyword' },
                            timeline_time: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis' },
                            acknowledged: { type: 'boolean' },
                            remarks_count: { type: 'integer' },
                            indexed_at: { type: 'date' }
                        }
                    }
                });
                this.logger.log(`Created index ${this.INDEX_NAME} with mappings`);
            }

            const body = documents.flatMap(doc => [
                { index: { _index: this.INDEX_NAME } },
                {
                    ...doc,
                    indexed_at: new Date().toISOString()
                }
            ]);

            await client.bulk({ body, refresh: 'wait_for' });

            this.logger.log(`Ingested ${documents.length} events into ${this.INDEX_NAME}`);
            return { message: `Successfully ingested ${documents.length} events`, count: documents.length };
        } else {
            return { message: 'No valid events found to ingest' };
        }
    }

    async getAllEvents() {
        const client = this.elasticService.getClient();

        // Ensure index exists before searching to avoid 404
        const exists = await client.indices.exists({ index: this.INDEX_NAME });
        if (!exists) return [];

        const result = await client.search({
            index: this.INDEX_NAME,
            query: {
                match_all: {}
            },
            size: 100
        });

        return result.hits.hits.map(hit => hit._source);
    }
}

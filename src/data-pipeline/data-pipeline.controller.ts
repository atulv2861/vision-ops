import { Controller, Get } from '@nestjs/common';
import { ElasticService } from '../../libs/common';

@Controller('data-pipeline')
export class DataPipelineController {
    constructor(private readonly elasticService: ElasticService) { }

    @Get('aggregated-metrics')
    async getAggregatedMetrics() {
        const client = this.elasticService.getClient();
        const indexName = this.elasticService.getAggregatedIndexName();

        const exists = await client.indices.exists({ index: indexName });
        if (!exists) {
            return { message: 'Aggregated index does not exist yet.', data: [] };
        }

        const result = await client.search({
            index: indexName,
            size: 10,
            sort: [{ timestamp: { order: 'desc' } }],
        });

        return {
            message: 'Latest aggregated metrics',
            data: result.hits.hits.map(hit => hit._source),
        };
    }
}

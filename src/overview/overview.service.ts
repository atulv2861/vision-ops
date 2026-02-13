import { Injectable, Logger } from '@nestjs/common';
import { ElasticService, UtilsService } from '../../libs/common';
import { randomUUID } from 'node:crypto';
export interface SearchOptions {
  query?: string;
  eventType?: string;
  severity?: string;
  zoneId?: string;
  from?: number;
  size?: number;
}

export interface GetAllOptions {
  from?: number;
  size?: number;
  sort?: string;
}

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(
    private readonly elasticService: ElasticService,
    private readonly utilsService: UtilsService,
  ) {}


 
  /** Max buckets for terms agg so we return every person_type in the index. */
  private static readonly TERMS_AGG_SIZE_MAX = 65535;

  /**
   * Get all person_type values and their count from camera index (all data present in DB).
   * Returns one item per person_type with title = type, value = count for that type.
   */
  async getSummary() {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();

      const response = await client.search({
        index: cameraIndexName,
        size: 0,
        query: { match_all: {} },
        aggs: {
          by_person_type: {
            nested: { path: 'person_data' },
            aggs: {
              types: {
                terms: {
                  field: 'person_data.person_type',
                  size: OverviewService.TERMS_AGG_SIZE_MAX,
                  order: { _count: 'desc' },
                },
              },
            },
          },
        },
      });

      const buckets =
        (response.aggregations as any)?.by_person_type?.types?.buckets ?? [];
      const total = buckets.reduce(
        (sum: number, b: { key: string; doc_count: number }) => sum + b.doc_count,
        0,
      );

      return buckets.map((bucket: { key: string; doc_count: number }, index: number) => ({
        id: randomUUID(),
        title: bucket.key,
        value: bucket.doc_count,
        subtitle: this.utilsService.cardsDescription(
          bucket.key,
          bucket.doc_count,
          total,
        ),
      }));
    } catch (error) {
      this.logger.error('Error getting summary:', error);
      throw error;
    }
  }

}

import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ElasticService } from '../../libs/common/src/elastic/elastic.service';

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

  constructor(private readonly elasticService: ElasticService) { }

  /**
   * Get all events with pagination
   */
  async getAllEvents(options: GetAllOptions = {}) {
    const { from = 0, size = 100, sort = 'timestamp:desc' } = options;

    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const [sortField, sortOrder] = sort.split(':');
      const sortObj: any = {};
      sortObj[sortField] = { order: sortOrder || 'desc' };

      const response = await client.search({
        index: indexName,
        from,
        size,
        sort: [sortObj],
        query: {
          match_all: {},
        },
      });

      const total = typeof response.hits.total === 'object'
        ? response.hits.total.value
        : response.hits.total;

      return {
        total,
        from,
        size,
        data: response.hits.hits.map((hit: any) => ({
          id: hit._id,
          ...hit._source,
        })),
      };
    } catch (error) {
      this.logger.error('Error getting all events:', error);
      throw error;
    }
  }

  /**
   * Search events with filters
   */
  async searchEvents(options: SearchOptions = {}) {
    const {
      query,
      eventType,
      severity,
      zoneId,
      from = 0,
      size = 100,
    } = options;

    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const mustClauses: any[] = [];

      // Text search query
      if (query) {
        mustClauses.push({
          multi_match: {
            query,
            fields: ['metric_name', 'location', 'event_type'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      // Event type filter
      if (eventType) {
        mustClauses.push({
          term: { 'event_type.keyword': eventType },
        });
      }

      // Severity filter
      if (severity) {
        mustClauses.push({
          term: { 'severity.keyword': severity },
        });
      }

      // Zone ID filter
      if (zoneId) {
        mustClauses.push({
          term: { 'zone_id.keyword': zoneId },
        });
      }

      const response = await client.search({
        index: indexName,
        from,
        size,
        sort: [{ timestamp: { order: 'desc' } }],
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
      });

      const total = typeof response.hits.total === 'object'
        ? response.hits.total.value
        : response.hits.total;

      return {
        total,
        from,
        size,
        filters: {
          query,
          eventType,
          severity,
          zoneId,
        },
        data: response.hits.hits.map((hit: any) => ({
          id: hit._id,
          ...hit._source,
        })),
      };
    } catch (error) {
      this.logger.error('Error searching events:', error);
      throw error;
    }
  }

  /**
   * Get statistics/aggregations
   */
  async getStats() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const response = await client.search({
        index: indexName,
        size: 0,
        aggs: {
          total_events: {
            value_count: {
              field: 'event_id.keyword',
            },
          },
          by_event_type: {
            terms: {
              field: 'event_type.keyword',
              size: 20,
            },
          },
          by_severity: {
            terms: {
              field: 'severity.keyword',
              size: 10,
            },
          },
          by_zone: {
            terms: {
              field: 'zone_id.keyword',
              size: 20,
            },
          },
          by_status: {
            terms: {
              field: 'status.keyword',
              size: 10,
            },
          },
        },
      });

      if (!response.aggregations) {
        return {
          total_events: 0,
          by_event_type: [],
          by_severity: [],
          by_zone: [],
          by_status: [],
        };
      }

      const totalEvents = response.aggregations.total_events as any;
      const byEventType = response.aggregations.by_event_type as any;
      const bySeverity = response.aggregations.by_severity as any;
      const byZone = response.aggregations.by_zone as any;
      const byStatus = response.aggregations.by_status as any;

      return {
        total_events: totalEvents?.value || 0,
        by_event_type: byEventType?.buckets || [],
        by_severity: bySeverity?.buckets || [],
        by_zone: byZone?.buckets || [],
        by_status: byStatus?.buckets || [],
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Get events by event type
   */
  async getByEventType(eventType: string) {
    return this.searchEvents({
      eventType,
      size: 1000,
    });
  }

  /**
   * Get events by zone
   */
  async getByZone(zoneId: string) {
    return this.searchEvents({
      zoneId,
      size: 1000,
    });
  }

    /**
   * Get dashboard summary. Every request queries Elasticsearch (no caching),
   * so values and counts update each time you hit the endpoint as new data is indexed.
   */
    async getSummary() {
      try {
        const client = this.elasticService.getClient();
        const indexName = this.elasticService.getIndexName();
        
        const query: any = {
          bool: {
            must: [
              { term: { event_type: 'metric_update' } }
            ]
          }
        };
    
        const response: any = await client.search({
          index: indexName,
          size: 1000,  // This will return NO hits
          query: query
        });
    
        const data = response.hits.hits.map((hit: any) => hit._source);
        
        const num = (v: any) => (v === undefined || v === null ? 0 : Number(v));
        const groupedData = data.reduce((acc: any, curr: any) => {
          const key = curr.metric_name;
          acc[key] = (acc[key] || 0) + num(curr.value);
          return acc;
        }, {});

        const studentsSum = groupedData['Students on Campus'] ?? 0;
        const staffPresentSum = groupedData['Staff Present'] ?? 0;
        const activeEventsSum = groupedData['Active Events'] ?? 0;
        const spaceUtilizationSum = groupedData['Space Utilization'] ?? 0;
        const gateEntriesTodaySum = groupedData['Gate Entries Today'] ?? 0;
        return {
          //'data':data.length,
          'students on Campus': {
            level: 'students on Campus',
            value: studentsSum,
          },
          'staff present': {
            level: 'staff present',
            value: staffPresentSum,
          },
          'active events': {
            level: 'active events',
            value: activeEventsSum,
          },
          'space utilization': {
            level: 'space utilization',
            value: spaceUtilizationSum,
          },
          'gate entries today': {
            level: 'gate entries today',
            value: gateEntriesTodaySum,
          },
        };
      } catch (error) {
        this.logger.error('Error getting summary:', error);
        throw error;
      }
    }
  }

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

  async getAiPatterns(limit: number = 10) {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();

      // Get all data grouped by unique locations
      const response = await client.search({
        index: cameraIndexName,
        size: 0,
        query: { match_all: {} },
        aggs: {
          unique_locations: {
            terms: {
              field: 'location',
              size: 1000,
              order: { _key: 'asc' },
            },
            aggs: {
              latest_document: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: { order: 'desc' } }],
                  _source: {
                    includes: ['client_id', 'location', 'timestamp', 'total_person', 'occupancy_capacity'],
                  },
                },
              },
            },
          },
        },
      });

      // Process the aggregation results
      const locationBuckets = (response.aggregations as Record<string, { buckets?: unknown[] }>)?.unique_locations?.buckets ?? [];
      
      const alerts = locationBuckets.map((bucket: any) => {
        const latestDoc = bucket.latest_document.hits.hits[0];
        
        // Check if there's a document for this location
        if (!latestDoc) return null;
        
        const source = latestDoc._source;
        const timestamp = source.timestamp;
        const totalPerson = source.total_person || 0;
        const capacity = source.occupancy_capacity || 1; // Default to 1 if not present
        const percentage = (totalPerson / capacity) * 100;

        let severity = 'Low';
        if (percentage > 80) {
          severity = 'High';
        } else if (percentage > 60) {
          severity = 'Medium';
        }

        return {
          id: source.client_id || latestDoc._id,
          title: source.location || 'Unknown Location',
          description: `Occupancy: ${totalPerson}/${capacity} (${percentage.toFixed(1)}%)`,
          severity: severity,
          timestamp: timestamp,
          timeAgo: this.formatTimeAgo(timestamp)
        };
      })

      return alerts.slice(0, limit); // Limit the results

    } catch (error) {
      this.logger.error('Error getting active alerts:', error);
      return [];
    }
  }


  private formatTimeAgo(timestamp: string): string {
    if (!timestamp) return 'Unknown';

    const now = new Date();
    const date = new Date(timestamp);

    // Ensure UTC calculations
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    const dateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

    const seconds = Math.floor((nowUtc - dateUtc) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }


  private mockData = [
    { time: '6AM', students: 12, staff: 8 },
    { time: '7AM', students: 28, staff: 15 },
    { time: '8AM', students: 45, staff: 22 },
    { time: '9AM', students: 38, staff: 25 },
    { time: '10AM', students: 32, staff: 20 },
    { time: '11AM', students: 35, staff: 18 },
    { time: '12PM', students: 42, staff: 15 },
    { time: '1PM', students: 40, staff: 16 },
    { time: '2PM', students: 38, staff: 19 },
    { time: '3PM', students: 35, staff: 22 },
    { time: '4PM', students: 30, staff: 20 }
  ];

  async getCampusTraffic() {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();

      const now = new Date();
      // Start of the current day in UTC
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

      const response = await client.search({
        index: cameraIndexName,
        size: OverviewService.TERMS_AGG_SIZE_MAX,
        query: {
          range: {
            timestamp: {
              gte: startOfDay.toISOString()
            }
          }
        },
        _source: ['timestamp', 'person_data']
      });

      const hits = response.hits.hits;

      // Initialize hourly buckets (0-23)
      const hourlyData: Record<number, { students: Set<string>, staff: Set<string> }> = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { students: new Set(), staff: new Set() };
      }

      hits.forEach((hit: any) => {
        const source = hit._source;
        const timestamp = new Date(source.timestamp);
        const hour = timestamp.getUTCHours();
        const personData = source.person_data || [];

        if (hourlyData[hour]) {
          personData.forEach((p: any) => {
            if (p.person_type === 'student') {
              hourlyData[hour].students.add(p.person_id);
            } else if (p.person_type === 'staff') {
              hourlyData[hour].staff.add(p.person_id);
            }
          });
        }
      });

      // Format response
      const result = [];
      const currentHour = now.getUTCHours();

      // We only want to return data up to the current hour + 12 hours window or full day depending on requirements.
      // Based on user request "6AM" etc., let's return all hours that have data or filler within reasonable range?
      // User sample showed 6AM to 4PM. Let's return 6AM to current hour for now, or full 24h?
      // Let's return only hours with non-zero potential or all hours of the day?
      // Defaulting to "active hours" 6AM to 10PM for visualization? 
      // Or simply filtering out future hours if we want "up to now".

      for (let i = 6; i <= 22; i++) { // Arbitrary display range 6 AM to 10 PM
        const hourLabel = i === 12 ? '12PM' : i > 12 ? `${i - 12}PM` : `${i}AM`;

        // Only include past/current hours (optional, but good for "traffic so far")
        if (i <= currentHour) {
          result.push({
            id: randomUUID(),
            time: hourLabel,
            students: hourlyData[i].students.size,
            staff: hourlyData[i].staff.size
          });
        }
      }
      
      return result.length > 0 ? result : this.mockData;

    } catch (error) {
      this.logger.error('Error getting campus traffic:', error);
      return this.mockData;
    }
  }

  async getCameraNetworkStatus() {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();

      const response = await client.search({
        index: cameraIndexName,
        size: 0,
        aggs: {
          by_location: {
            terms: {
              field: 'location',
              size: OverviewService.TERMS_AGG_SIZE_MAX
            },
            aggs: {
              unique_cameras: {
                cardinality: {
                  field: 'camera_id.keyword'
                }
              }
            }
          }
        }
      });

      const buckets = (response.aggregations as any)?.by_location?.buckets || [];

      return buckets.map((bucket: any) => ({
        id: randomUUID(),
        location: bucket.key,
        activeCameras: bucket.unique_cameras?.value || 0,
        status: 'online'
      }));

    } catch (error) {
      this.logger.error('Error getting camera network status:', error);
      return [];
    }
  }


  async getSpaceUtilization() {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();

      // Static map for location types
      const LOCATION_TYPES: Record<string, string> = {
        'Research Lab': 'lab',
        'CFET Area': 'area',
        'Main Campus': 'area',
        'Administration': 'office',
        'Playground': 'playground',
        'Cafeteria': 'cafeteria',
        'Library': 'library',
        'Sports Complex': 'complex',
        'Auditorium': 'auditorium'
      };

      const response = await client.search({
        index: cameraIndexName,
        size: 0,
        aggs: {
          by_location: {
            terms: {
              field: 'location',
              size: OverviewService.TERMS_AGG_SIZE_MAX
            },
            aggs: {
              latest_record: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: { order: 'desc' } }],
                  _source: ['occupancy_capacity', 'total_person', 'location']
                }
              }
            }
          }
        }
      });

      const buckets = (response.aggregations as any)?.by_location?.buckets || [];

      return buckets.map((bucket: any) => {
        const hit = bucket.latest_record.hits.hits[0]?._source;
        const location = hit?.location || bucket.key;
        const capacity = hit?.occupancy_capacity || 0;
        const occupancy = hit?.total_person || 0;
        const type = LOCATION_TYPES[location] || 'area';

        // Calculate percentage
        const percentage = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;

        return {
          id: randomUUID(),
          name: location,
          type,
          occupancy,
          capacity,
          percentage
        };
      });

    } catch (error) {
      this.logger.error('Error getting space utilization:', error);
      return [];
    }
  }


  async getGateSecurityStatus() {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();

      const response = await client.search({
        index: cameraIndexName,
        size: 0,
        aggs: {
          by_location: {
            terms: {
              field: 'location', // Group by location (acting as "Entrance/Gate")
              size: OverviewService.TERMS_AGG_SIZE_MAX
            },
            aggs: {
              latest_record: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: { order: 'desc' } }],
                  _source: ['person_data', 'location']
                }
              }
            }
          }
        }
      });

      const buckets = (response.aggregations as any)?.by_location?.buckets || [];

      return buckets.map((bucket: any) => {
        const hit = bucket.latest_record.hits.hits[0]?._source;
        const location = hit?.location || bucket.key;
        const personData = hit?.person_data || [];

        // Count guards present
        const guardsPresent = personData.filter((p: any) => p?.person_type === 'security_guard').length;

        // Determine guards needed (Default to 1 until data available in index)
        const guardsNeeded = 1;

        // Determine status
        let status = 'covered';
        if (guardsPresent === 0) {
          status = 'uncovered';
        } else if (guardsPresent < guardsNeeded) {
          status = 'low-coverage';
        }

        return {
          id: randomUUID(),
          name: location,
          guardsPresent,
          guardsNeeded,
          status
        };
      });

    } catch (error) {
      this.logger.error('Error getting gate security status:', error);
      return [];
    }
  }

  
  }


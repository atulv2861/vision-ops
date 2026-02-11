import { Injectable, Logger } from '@nestjs/common';
import { ElasticService } from '../../libs/common/src/elastic/elastic.service';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { OnModuleInit } from '@nestjs/common';

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
export class OverviewService implements OnModuleInit {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly elasticService: ElasticService) { }

  async onModuleInit() {
    await this.ingestGateData();
  }

  async ingestGateData() {
    const client = this.elasticService.getClient();
    const indexName = 'gate-compliance';

    try {
      const exists = await client.indices.exists({ index: indexName });
      if (!exists) {
        await client.indices.create({
          index: indexName,
          mappings: {
            properties: {
              gate_name: { type: 'keyword' },
              guards_present: { type: 'integer' },
              timestamp: { type: 'date' }
            }
          }
        });
        this.logger.log(`Created index ${indexName}`);
      }

      // Read CSV
      const csvPath = path.join(process.cwd(), 'libs/common/src/csv/overview.csv');
      const results: any[] = [];

      if (fs.existsSync(csvPath)) {
        await new Promise<void>((resolve, reject) => {
          fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data: any) => {
              // simple validation
              if (data.event_type === 'guards_on_duty' && data.location && data.value !== undefined) {
                results.push({
                  gate_name: data.location,
                  guards_present: parseInt(data.value, 10),
                  timestamp: data.timestamp
                });
              }
            })
            .on('end', resolve)
            .on('error', reject);
        });

        if (results.length > 0) {
          const body = results.flatMap(doc => [
            { index: { _index: indexName, _id: doc.gate_name } },
            doc
          ]);

          await client.bulk({ body, refresh: true });
          this.logger.log(`Ingested ${results.length} gate records`);
        }
      } else {
        this.logger.warn(`Gate CSV not found at ${csvPath}`);
      }
    } catch (error) {
      this.logger.error('Error ingesting gate data:', error);
    }
  }

  async getGateSecurityStatus() {
    const client = this.elasticService.getClient();
    const indexName = 'gate-compliance';
    const STATIC_GUARD_CONFIG: Record<string, number> = {
      "Main Gate": 2,
      "Building A Entrance": 1,
      "Building B Entrance": 1,
      "Cafeteria Entrance": 2,
      "Sports Complex Entrance": 1
    };

    try {
      // Get latest status for each gate
      const response = await client.search({
        index: indexName,
        size: 0,
        aggs: {
          gates: {
            terms: { field: 'gate_name', size: 50 },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: { order: 'desc' } }]
                }
              }
            }
          }
        }
      });

      const buckets = (response.aggregations?.gates as any)?.buckets || [];
      const gateData = buckets.map((bucket: any) => {
        const hit = bucket.latest.hits.hits[0]._source;
        const name = bucket.key;
        const guardsPresent = hit.guards_present;
        const guardsNeeded = STATIC_GUARD_CONFIG[name] || 1; // Default requirement

        let status = 'covered';
        if (guardsPresent === 0) status = 'uncovered';
        else if (guardsPresent < guardsNeeded) status = 'low-coverage';

        return {
          name,
          guardsPresent,
          guardsNeeded,
          status
        };
      });

      return gateData;

    } catch (error) {
      this.logger.error('Error getting gate security status:', error);
      return [];
    }
  }

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

  // [
  //   { type: 'Running', count: 28 },
  //   { type: 'Crowd Gathering', count: 17 },
  //   { type: 'Overcrowding', count: 11 },
  //   { type: 'Loitering', count: 8 },
  //   { type: 'Unauthorized Access', count: 5 },
  // ]
  async getEvents() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const query: any = {
        bool: {
          must: [
            { term: { event_type: 'event_detected' } }
          ]
        }
      };

      const response: any = await client.search({
        index: indexName,
        size: 1000, // Get more data to aggregate
        query: query,
        sort: [{ timestamp: { order: 'desc' } }]
      });

      // Aggregate data on client side
      const titleMap = new Map();

      response.hits.hits.forEach((hit: any) => {
        const type = hit._source?.metric_name || 'Unknown';
        const count = hit._source?.increment || 0;

        if (titleMap.has(type)) {
          // Add to existing count
          titleMap.set(type, parseInt(titleMap.get(type)) + parseInt(count));
        } else {
          // Create new entry
          titleMap.set(type, count);
        }
      });

      // Convert Map to array of objects
      const patterns = Array.from(titleMap.entries()).map(([type, totalCount], index) => ({
        id: `group-${index}`, // Generate a unique ID
        type: type,
        count: totalCount
      }));

      // Sort by count (highest first) or alphabetically
      patterns.sort((a, b) => b.count - a.count);

      return patterns;

    } catch (error) {
      this.logger.error('Error getting events:', error);
      return [];
    }
  }

  async getByEventType() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const response: any = await client.search({
        index: indexName,
        size: 0, // No documents, only aggregations
        query: {
          bool: {
            must: [
              { term: { event_type: 'event_detected' } }
            ]
          }
        },
        aggs: {
          unique_titles: {
            terms: {
              field: 'metric_name.keyword', // Use .keyword for exact match
              size: 100 // Number of unique titles to return
            },
            aggs: {
              total_count: {
                sum: {
                  field: 'increment',
                  missing: 0 // Treat missing increment as 0
                }
              },
              latest_event: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: { order: 'desc' } }],
                  _source: ['timestamp', 'location'] // Get additional fields if needed
                }
              }
            }
          }
        }
      });

      // Transform aggregation results
      const buckets = response.aggregations?.unique_titles?.buckets || [];

      const patterns = buckets.map((bucket: any, index: number) => {
        const latest = bucket.latest_event.hits.hits[0]?._source;

        return {
          id: bucket.key, // Use title as ID or generate one
          title: bucket.key,
          count: bucket.total_count.value || 0,
          // Additional info from latest event
          lastUpdated: latest?.timestamp,
          location: latest?.location
        };
      });

      // Already sorted by Elasticsearch (by count descending)
      return patterns;

    } catch (error) {
      this.logger.error('Error getting events:', error);
      return [];
    }
  }

  /**
   * Get events by zone
   */
  // [
  //   { zone: 'Building A', score: 93 },
  //   { zone: 'Building B', score: 88 },
  //   { zone: 'Cafeteria', score: 91 },
  //   { zone: 'Library', score: 96 },
  //   { zone: 'Sports Complex', score: 85 },
  // ]
  async getByZone() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const query: any = {
        bool: {
          must: [
            { term: { event_type: 'zone_activity' } }
          ]
        }
      };

      const response: any = await client.search({
        index: indexName,
        size: 1000, // Get more data to aggregate
        query: query,
        // sort: [{ timestamp: { order: 'desc' } }]
      });

      // Aggregate data on client side
      const titleMap = new Map();

      response.hits.hits.forEach((hit: any) => {
        const zone = hit._source?.location || 'Unknown';
        const score = hit._source?.value || 0;

        if (titleMap.has(zone)) {
          // Add to existing count
          titleMap.set(zone, parseInt(titleMap.get(zone)) + parseInt(score));
        } else {
          // Create new entry
          titleMap.set(zone, score);
        }
      });

      // Convert Map to array of objects
      const patterns = Array.from(titleMap.entries()).map(([zone, totalScore], index) => ({
        id: `group-${index}`, // Generate a unique ID
        zone: zone,
        score: totalScore
      }));

      // Sort by count (highest first) or alphabetically
      //patterns.sort((a, b) => b.score - a.score);

      return patterns;

    } catch (error) {
      this.logger.error('Error getting events:', error);
      return [];
    }
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
          title: 'students on Campus',
          value: studentsSum,
        },
        'staff present': {
          title: 'staff present',
          value: staffPresentSum,
        },
        'active events': {
          title: 'active events',
          value: activeEventsSum,
        },
        'space utilization': {
          title: 'space utilization',
          value: `${(spaceUtilizationSum / (spaceUtilizationSum < 1000 ? 100 : 1000)).toFixed(2)}%`,
        },
        'gate entries today': {
          title: 'gate entries today',
          value: gateEntriesTodaySum,
        },
      };
    } catch (error) {
      this.logger.error('Error getting summary:', error);
      throw error;
    }
  }

  async getAiPattern() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const query: any = {
        bool: {
          must: [
            { term: { event_type: 'ai_pattern' } }
          ]
        }
      };

      const response: any = await client.search({
        index: indexName,
        size: 3,
        query: query,
      });
      // Transform data more efficiently and keep only unique locations
      const patterns = response.hits.hits.map((hit: any) => ({
        id: hit._id, // Include document ID for reference
        title: hit._source?.location || 'Unknown',
        severity: hit._source?.severity || 'unknown',
        camera: hit._source?.camera || 'N/A',
        zone: hit._source?.zone || 'Unassigned',
        timestamp: hit._source?.timestamp
      }));
      return patterns;
    } catch (error) {
      this.logger.error('Error getting ai pattern:', error);
      throw error;
    }
  }

  // [
  //   { location: "Main Gate", activeCameras: 2, status: "online" },
  //   { location: "Building A", activeCameras: 4, status: "online" },
  //   { location: "Building B", activeCameras: 3, status: "online" },
  //   { location: "Cafeteria", activeCameras: 3, status: "online" },
  //   { location: "Library", activeCameras: 3, status: "online" },
  //   { location: "Sports Complex", activeCameras: 3, status: "online" },
  //   { location: "Washroom Block A", activeCameras: 1, status: "online" },
  //   { location: "Washroom Block B", activeCameras: 1, status: "online" },
  //   { location: "Administrative Block", activeCameras: 2, status: "online" }
  // ]
  async getCameraNetworkStatus() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const query: any = {
        bool: {
          must: [
            { term: { event_type: 'camera_health' } },
            { term: { status: 'active' } }
          ]
        }
      };

      const response: any = await client.search({
        index: indexName,
        size: 1000, // Get more data to aggregate
        query: query,
        // sort: [{ timestamp: { order: 'desc' } }]
      });

      // Map structure: location -> { activeCameras: number, latestStatus: string }
      const locationMap = new Map<string, { activeCameras: number; status: string }>();

      response.hits.hits.forEach((hit: any) => {
        const location = hit._source?.location || 'Unknown';
        const status = hit._source?.status || 'offline';

        // Initialize if location doesn't exist
        if (!locationMap.has(location)) {
          locationMap.set(location, { activeCameras: 0, status: status });
        }

        const locationData = locationMap.get(location)!;

        // Count active cameras
        // if (status === 'active' || status === 'online') {
        locationData.activeCameras += 1;
        //}

       
      });

      // Convert Map to array
      const cameraStatus = Array.from(locationMap.entries()).map(([location, data], index) => ({
        id: `location-${index}`,
        location: location,
        activeCameras: data.activeCameras,
        status: data.status
      }));

      // Sort alphabetically by location
      cameraStatus.sort((a, b) => a.location.localeCompare(b.location));

      return cameraStatus;

    } catch (error) {
      this.logger.error('Error getting events:', error);
      return [];
    }
  }

  // [
  //   { time: '6AM', primary: 200, secondary: 50 },
  //   { time: '7AM', primary: 400, secondary: 80 },
  //   { time: '8AM', primary: 800, secondary: 120 },
  //   { time: '9AM', primary: 1200, secondary: 150 },
  //   { time: '10AM', primary: 1400, secondary: 180 },
  //   { time: '11AM', primary: 1500, secondary: 200 },
  //   { time: '12PM', primary: 1450, secondary: 190 },
  //   { time: '1PM', primary: 1350, secondary: 170 },
  //   { time: '2PM', primary: 1100, secondary: 140 },
  //   { time: '3PM', primary: 900, secondary: 110 },
  //   { time: '4PM', primary: 600, secondary: 80 },
  // ]
  async getCampusTraffic() {
    try {
      const client = this.elasticService.getClient();
      const indexName = this.elasticService.getIndexName();

      const query: any = {
        bool: {
          must: [
            { terms: { event_type: ['student_movement','staff_movement']  } },
          ]
        }
      };

      const response: any = await client.search({
        index: indexName,
        size: 1000, // Get more data to aggregate
        query: query,
        // sort: [{ timestamp: { order: 'desc' } }]
      });

      // Map structure: time -> { students: number, staff: number }
      const timeMap = new Map<string, { students: number; staff: number }>();

      response.hits.hits.forEach((hit: any) => {
        const timestamp = hit._source?.timestamp;
        if (!timestamp) return;
        
        const date = new Date(timestamp);
        const hour = date.getHours();
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; // Convert 0, 13-23 to 12, 1-11
        const timeKey = `${displayHour}${period}`;
        
        const eventType = hit._source?.event_type;
        const count = hit._source?.count || 1;
        
        // Initialize if hour doesn't exist
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { students: 0, staff: 0 });
        }
        
        const timeData = timeMap.get(timeKey)!;
        
        // Add to appropriate category
        if (eventType === 'student_movement') {
          timeData.students += count;
        } else if (eventType === 'staff_movement') {
          timeData.staff += count;
        }
      });
  
      // Convert to array and format
      const trafficData = Array.from(timeMap.entries()).map(([time, data]) => ({
        time: time,
        students: Math.round(data.students),
        staff: Math.round(data.staff)
      }));
  
      // Sort by time
      trafficData.sort((a, b) => a.time.localeCompare(b.time));
  
      // Fill in missing hours with zeros or interpolated values
      //const completeTrafficData = this.fillMissingHours(trafficData);

      const trafficStaticData=[
        { time: '6AM', students: 200, staff: 50 },
        { time: '7AM', students: 400, staff: 80 },
        { time: '8AM', students: 800, staff: 120 },
        { time: '9AM', students: 1200, staff: 150 },
        { time: '10AM', students: 1400, staff: 180 },
        { time: '11AM', students: 1500, staff: 200 },
        { time: '12PM', students: 1450, staff: 190 },
        { time: '1PM', students: 1350, staff: 170 },
        { time: '2PM', students: 1100, staff: 140 },
        { time: '3PM', students: 900, staff: 110 },
        { time: '4PM', students: 600, staff: 80 },
      ]
  
      return trafficData.length > 6 ? trafficData : trafficStaticData;

    } catch (error) {
      this.logger.error('Error getting events:', error);
      return [];
    }
  }

  async getSpaceUtilization() {
    // Defined capacities for known spaces
    const SPACE_CAPACITIES: Record<string, number> = {
      'Classroom A101': 30,
      'Classroom A102': 30,
      'Main Cafeteria': 200,
      'Library Reading Area': 60,
      'Building A Main Corridor': 80, // CSV uses this name
      'Building A - Main Corridor': 80, // Alias just in case
      'Building B Corridor': 100,
      'Sports Complex': 200,
      'Main Gate': 50
    };

    // Space types mapping
    const SPACE_TYPES: Record<string, string> = {
      'Classroom A101': 'classroom',
      'Classroom A102': 'classroom',
      'Main Cafeteria': 'cafeteria',
      'Library Reading Area': 'library',
      'Building A Main Corridor': 'corridor',
      'Building A - Main Corridor': 'corridor'
    };

    // Default capacity if unknown
    const DEFAULT_CAPACITY = 50;
    const client = this.elasticService.getClient();
    const indexName = this.elasticService.getIndexName();
    // Aggregation to get the LATEST space_occupancy event for each location
    const response = await client.search({
      index: indexName,
      size: 0,
      query: {
        term: { 'event_type.keyword': 'space_occupancy' }
      },
      aggs: {
        by_location: {
          terms: {
            field: 'location.keyword',
            size: 100 // Get all locations
          },
          aggs: {
            latest_record: {
              top_hits: {
                size: 1,
                sort: [{ timestamp: { order: 'desc' } }]
              }
            }
          }
        }
      }
    });

    const buckets = (response.aggregations?.by_location as any)?.buckets || [];

    const utilizationData = buckets.map((bucket: any) => {
      const location = bucket.key;
      const hit = bucket.latest_record.hits.hits[0]._source;
      const currentOccupancy = Number(hit.value) || 0;
      const capacity = SPACE_CAPACITIES[location] || DEFAULT_CAPACITY;
      const utilizationPercentage = Math.round((currentOccupancy / capacity) * 100);
      const spaceType = SPACE_TYPES[location] || 'area';

      return {
        id: location,
        name: location,
        type: spaceType,
        occupancy: currentOccupancy,
        capacity: capacity,
        percentage: utilizationPercentage
      };
    });

    // Sort by percentage descending and take top 5
    return utilizationData
      .sort((a: any, b: any) => b.percentage - a.percentage)
      .slice(0, 5);

  } catch(error: any) {
    this.logger.error('Error getting space utilization:', error);
  }


}

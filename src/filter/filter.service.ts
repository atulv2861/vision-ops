import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ElasticService } from '../../libs/common';
export type LocationResponse = { client_id: string; location: unknown };
export type CameraResponse = { location_id: string; camera: unknown };

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);

  constructor(private readonly configService: ConfigService, private readonly elasticService: ElasticService) {}


async getCameraLocation() {
    try {
      const client = this.elasticService.getClient();
      const cameraIndexName = this.elasticService.getCameraIndexName();
      const response = await client.search({
        index: cameraIndexName,
        size: 0,
        aggs: {
          by_location: {
            terms: {
              field: 'location', // Group by location name
              size: 10000
            },
            aggs: {
              location_id: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: ['location_id']
                  }
                }
              }
            }
          }
        }
      });

      const buckets = (response.aggregations as any)?.by_location?.buckets || [];
      
      return buckets.map((bucket: any) => ({
        id: bucket.location_id?.hits?.hits[0]?._source?.location_id as string,
        location: bucket.key, // bucket.key contains the location name
      }));
    } catch (error) {
      this.logger.error('Error getting camera location:', error);
      return [];
    }
}
  
async getCameraByLocation(location_id: string) {
    try {
        const client = this.elasticService.getClient();
        const cameraIndexName = this.elasticService.getCameraIndexName();
        
        const response = await client.search({
            index: cameraIndexName,
            query: {
                term: { location_id: location_id } // Filter by location_id
            },
            size: 1000, // Get actual documents
            _source: ['camera_id', 'name'] // Get camera_id and location name
        });

        // Extract unique cameras using a Map to avoid duplicates
        const cameraMap = new Map();
        let index=0;
        response.hits.hits.forEach((hit: any) => {
            const source = hit._source;

            if (source.camera_id) {
                cameraMap.set(source.camera_id, {
                    camera_id: source.camera_id,
                    name: source.name // Using location as camera name
                });
            }
        });

        // Convert Map values to array
        return Array.from(cameraMap.values());
        
    } catch (error) {
        this.logger.error('Error getting cameras by location:', error);
        return [];
    }
}
}
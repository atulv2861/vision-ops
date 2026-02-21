import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { toIsoTimestamp } from '../utils/date.util';

/** Incoming timestamp format from Kafka: "yyyy-MM-dd HH:mm:ss". ES date field accepts this via format below. */
const TIMESTAMP_DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis';

@Injectable()
export class ElasticService implements OnModuleInit {
  private readonly logger = new Logger(ElasticService.name);
  private client: Client;
  private cameraStatusIndexName: string;
  private peopleDistributionIndexName: string;

  constructor(private readonly configService: ConfigService) {
    const node = this.configService.get<string>('elasticsearch.node') || 'http://34.173.116.41:9200';
    const username = this.configService.get<string>('elasticsearch.username') || 'elastic';
    const password = this.configService.get<string>('elasticsearch.password') || 'variphi@2024';
    this.cameraStatusIndexName =
      this.configService.get<string>('elasticsearch.cameraStatusIndex') ?? 'camera_status';
    this.peopleDistributionIndexName =
      this.configService.get<string>('elasticsearch.peopleDistributionIndex') ?? 'people_distribution';
    const requestTimeout = this.configService.get<number>('elasticsearch.requestTimeout', 30000);

    const clientOptions: ClientOptions = {
      node,
      auth: {
        username,
        password,
      },
      requestTimeout,
      maxRetries: 5,
    };

    this.client = new Client(clientOptions);
  }

  async onModuleInit() {
    await this.ensureCameraStatusIndexExists();
    await this.ensurePeopleDistributionIndexExists();
  }

  /**
   * Ensure the camera_status Elasticsearch index exists
   */
  private async ensureCameraStatusIndexExists() {
    const indexName = this.cameraStatusIndexName;
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (!exists) {
        this.logger.log(`Creating Elasticsearch index: ${indexName}`);
        await this.client.indices.create({
          index: indexName,
          settings: { number_of_shards: 1, number_of_replicas: 0 },
          mappings: {
            properties: {
              client_id: { type: 'keyword' },
              location_id: { type: 'keyword' },
              location: { type: 'keyword' },
              camera_id: { type: 'keyword' },
              timestamp: { type: 'date', format: TIMESTAMP_DATE_FORMAT },
              camera_status: { type: 'integer' },
              name: { type: 'keyword' },
            },
          },
        });
        this.logger.log(`Elasticsearch index '${indexName}' created successfully`);
      } else {
        this.logger.log(`Elasticsearch index '${indexName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring camera_status index exists: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Ensure the people_distribution Elasticsearch index exists
   */
  private async ensurePeopleDistributionIndexExists() {
    const indexName = this.peopleDistributionIndexName;
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (!exists) {
        this.logger.log(`Creating Elasticsearch index: ${indexName}`);
        await this.client.indices.create({
          index: indexName,
          settings: { number_of_shards: 1, number_of_replicas: 0 },
          mappings: {
            properties: {
              client_id: { type: 'keyword' },
              camera_id: { type: 'keyword' },
              name: { type: 'keyword' },
              timestamp: { type: 'date', format: TIMESTAMP_DATE_FORMAT },
              location: { type: 'keyword' },
              location_id: { type: 'keyword' },
              occupancy_capacity: { type: 'integer' },
              total_person: { type: 'integer' },
              avg_dwell_time: { type: 'float' },
              person_data: {
                type: 'nested',
                properties: {
                  person_id: { type: 'keyword' },
                  person_type: { type: 'keyword' },
                  dwell_time: { type: 'integer' },
                },
              },
              unique_person: { type: 'integer' },              
            },
          },
        });
        this.logger.log(`Elasticsearch index '${indexName}' created successfully`);
      } else {
        this.logger.log(`Elasticsearch index '${indexName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring people_distribution index exists: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Check if Elasticsearch is connected
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response;
    } catch (error) {
      this.logger.error('Elasticsearch connection check failed', error);
      return false;
    }
  }

  /**
   * Get the Elasticsearch client (for advanced operations)
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Get the camera_status index name
   */
  getCameraStatusIndexName(): string {
    return this.cameraStatusIndexName;
  }

  /**
   * Get the people_distribution index name
   */
  getPeopleDistributionIndexName(): string {
    return this.peopleDistributionIndexName;
  }

  /**
   * Index a single camera status document (enriched from Kafka) into camera_status index
   */
  async indexCameraStatusDocument(document: {
    _id?: string;
    client_id?: string;
    location_id?: string;
    location?: string;
    camera_id: string;
    name?: string;
    timestamp?: string;
    camera_status: number;
  }): Promise<void> {
    try {
      const { _id, ...doc } = document;
      const body = {
        ...doc,
        timestamp: toIsoTimestamp(document.timestamp) || new Date().toISOString(),
        indexed_at: new Date().toISOString(),
      };
      await this.client.index({
        index: this.cameraStatusIndexName,
        ...(_id && { id: _id }),
        body,
        refresh: 'wait_for',
      });
      this.logger.debug(`Camera status document indexed - camera_id: ${document.camera_id}`);
    } catch (error) {
      this.logger.error(`Error indexing camera status document: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Index a single people_distribution document (enriched from Kafka) into people_distribution index
   */
  async indexPeopleDistributionDocument(
    document: {
      _id?: string;
      client_id?: string;
      camera_id: string;
      name?: string;
      timestamp: string;
      location?: string;
      location_id?: string;
      occupancy_capacity: number;
      total_person: number;
      avg_dwell_time?: number;
      person_data: Array<{ person_id: string; person_type: string; dwell_time: number }>;
      unique_person: number;
    },
  ): Promise<void> {
    try {
      const { _id, ...doc } = document;
      const timestampForEs = toIsoTimestamp(document.timestamp) || new Date().toISOString();
      const body = {
        ...doc,
        timestamp: timestampForEs,
        indexed_at: new Date().toISOString(),
      };
      await this.client.index({
        index: this.peopleDistributionIndexName,
        ...(_id && { id: _id }),
        body,
        refresh: 'wait_for',
      });
      this.logger.debug(`People distribution document indexed - camera_id: ${document.camera_id}`);
    } catch (error) {
      this.logger.error(`Error indexing people_distribution document: ${error.message}`, error);
      throw error;
    }
  }

  async getLatestCameraStats(cameraId: string): Promise<{ avg_dwell_time: number; cumulative_unique_person: number }> {
    try {
      const exists = await this.client.indices.exists({ index: this.peopleDistributionIndexName });
      if (!exists) return { avg_dwell_time: 0, cumulative_unique_person: 0 };

      const response = await this.client.search({
        index: this.peopleDistributionIndexName,
        size: 1,
        sort: [{ timestamp: { order: 'desc' } }],
        query: {
          term: { camera_id: cameraId }
        }
      });

      const hits = response.hits.hits;
      if (hits.length > 0) {
        const doc = hits[0]._source as any;
        return {
          avg_dwell_time: Number(doc.avg_dwell_time) || 0,
          cumulative_unique_person: Number(doc.cumulative_unique_person) || 0
        };
      }
      return { avg_dwell_time: 0, cumulative_unique_person: 0 };
    } catch (error) {
      this.logger.error(`Error fetching latest stats for camera ${cameraId}: ${error.message}`);
      return { avg_dwell_time: 0, cumulative_unique_person: 0 };
    }
  }
}

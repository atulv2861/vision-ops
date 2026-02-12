import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientOptions } from '@elastic/elasticsearch';
import {
  VISION_OPS_CAMERA_INDEX_MAPPING,
  VISION_OPS_CAMERA_INDEX_SETTINGS,
} from './vision-ops-camera.index';

@Injectable()
export class ElasticService implements OnModuleInit {
  private readonly logger = new Logger(ElasticService.name);
  private client: Client;
  private indexName: string;
  private cameraIndexName: string;

  constructor(private readonly configService: ConfigService) {
    const node = this.configService.get<string>('elasticsearch.node') || 'http://34.173.116.41:9200';
    const username = this.configService.get<string>('elasticsearch.username') || 'elastic';
    const password = this.configService.get<string>('elasticsearch.password') || 'variphi@2024';
    this.indexName = this.configService.get<string>('elasticsearch.index') || 'vision-ops-overview';
    this.cameraIndexName =
      this.configService.get<string>('elasticsearch.cameraIndex') ?? 'vision-ops-camera';
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
    await this.ensureIndexExists();
    await this.ensureCameraIndexExists();
  }

  /**
   * Ensure the Elasticsearch index exists, create it if it doesn't
   */
  private async ensureIndexExists() {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });

      if (!exists) {
        this.logger.log(`Creating Elasticsearch index: ${this.indexName}`);
        await this.client.indices.create({
          index: this.indexName,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
          mappings: {
            properties: {
              event_id: { type: 'keyword' },
              timestamp: { type: 'date' },
              event_type: { type: 'keyword' },
              metric_name: { type: 'text' },
              location: { type: 'text' },
              value: { type: 'keyword' },
              increment: { type: 'integer' },
              previous_value: { type: 'keyword' },
              status: { type: 'keyword' },
              severity: { type: 'keyword' },
              camera_id: { type: 'keyword' },
              zone_id: { type: 'keyword' },
            },
          },
        });
        this.logger.log(`Elasticsearch index '${this.indexName}' created successfully`);
      } else {
        this.logger.log(`Elasticsearch index '${this.indexName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring index exists: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Ensure the vision-ops-camera index exists for camera occupancy / person data
   */
  private async ensureCameraIndexExists() {
    const indexName = this.cameraIndexName;
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (!exists) {
        this.logger.log(`Creating Elasticsearch index: ${indexName}`);
        await this.client.indices.create({
          index: indexName,
          settings: VISION_OPS_CAMERA_INDEX_SETTINGS,
          mappings: VISION_OPS_CAMERA_INDEX_MAPPING,
        });
        this.logger.log(`Elasticsearch index '${indexName}' created successfully`);
      } else {
        this.logger.log(`Elasticsearch index '${indexName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring camera index exists: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Index a single document (only CSV fields, no metadata)
   */
  async indexDocument(document: any): Promise<void> {
    try {
      // Only store the document data (CSV fields), no metadata
      const body = {
        ...document,
        indexed_at: new Date().toISOString(),
      };

      const response = await this.client.index({
        index: this.indexName,
        body,
        refresh: 'wait_for', // Wait for the document to be searchable
      });

      this.logger.debug(
        `Document indexed - ID: ${response._id}, Index: ${this.indexName}, Event ID: ${document.event_id || 'N/A'}`,
      );
    } catch (error) {
      this.logger.error(`Error indexing document: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Bulk index multiple documents (only CSV fields, no metadata)
   */
  async bulkIndex(documents: Array<{ document: any }>): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    try {
      const body = documents.flatMap(({ document }) => [
        { index: { _index: this.indexName } },
        {
          ...document,
          indexed_at: new Date().toISOString(),
        },
      ]);

      const response = await this.client.bulk({ body, refresh: 'wait_for' });

      if (response.errors) {
        const erroredItems = response.items.filter((item: any) => item.index?.error);
        this.logger.error(`Bulk index had ${erroredItems.length} errors out of ${documents.length} documents`);
        erroredItems.forEach((item: any) => {
          this.logger.error(`Bulk index error: ${JSON.stringify(item.index.error)}`);
        });
      } else {
        this.logger.log(`Successfully bulk indexed ${documents.length} documents to ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error(`Error bulk indexing documents: ${error.message}`, error);
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
   * Get the index name
   */
  getIndexName(): string {
    return this.indexName;
  }

  /**
   * Get the camera index name (vision-ops-camera)
   */
  getCameraIndexName(): string {
    return this.cameraIndexName;
  }

  /**
   * Index a single camera occupancy document into vision-ops-camera
   */
  async indexCameraDocument(document: {
    client_id?: string;
    camera_id: string;
    timestamp: string;
    location?: string;
    location_id?: string;
    occupancy_capacity: number;
    total_person: number;
    person_data: Array<{ person_id: string; person_type: string; dwell_time: number }>;
    unique_person: number;
  }): Promise<void> {
    try {
      const body = {
        ...document,
        indexed_at: new Date().toISOString(),
      };
      await this.client.index({
        index: this.cameraIndexName,
        body,
        refresh: 'wait_for',
      });
      this.logger.debug(`Camera document indexed - camera_id: ${document.camera_id}`);
    } catch (error) {
      this.logger.error(`Error indexing camera document: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Bulk index camera documents into vision-ops-camera
   */
  async bulkIndexCameraDocuments(
    documents: Array<{
      client_id?: string;
      camera_id: string;
      timestamp: string;
      location?: string;
      location_id?: string;
      occupancy_capacity: number;
      total_person: number;
      person_data: Array<{ person_id: string; person_type: string; dwell_time: number }>;
      unique_person: number;
    }>,
  ): Promise<void> {
    if (documents.length === 0) return;
    try {
      const body = documents.flatMap((doc) => [
        { index: { _index: this.cameraIndexName } },
        { ...doc, indexed_at: new Date().toISOString() },
      ]);
      const response = await this.client.bulk({ body, refresh: 'wait_for' });
      if (response.errors) {
        const erroredItems = response.items.filter((item: any) => item.index?.error);
        this.logger.error(`Bulk camera index had ${erroredItems.length} errors`);
        erroredItems.forEach((item: any) => this.logger.error(JSON.stringify(item.index?.error)));
      } else {
        this.logger.log(`Bulk indexed ${documents.length} camera documents to ${this.cameraIndexName}`);
      }
    } catch (error) {
      this.logger.error(`Error bulk indexing camera documents: ${error.message}`, error);
      throw error;
    }
  }
}

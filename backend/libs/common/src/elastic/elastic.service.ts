import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticService implements OnModuleInit {
  private readonly logger = new Logger(ElasticService.name);
  private client: Client;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    try {
      const node = this.configService.get<string>('ELASTICSEARCH_NODE');
      const username = this.configService.get<string>('ELASTICSEARCH_USERNAME');
      const password = this.configService.get<string>('ELASTICSEARCH_PASSWORD');

      if (!node) {
        this.logger.warn('Elasticsearch node not configured, indexing disabled');
        return;
      }

      this.client = new Client({
        node,
        auth: username && password ? { username, password } : undefined,
        maxRetries: 3,
        requestTimeout: 30000,
        // Disable version compatibility check - use server's version
        enableMetaHeader: false,
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;
      this.logger.log('✓ Elasticsearch connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Index a single document
   */
  async indexDocument(index: string, id: string, document: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.debug('Elasticsearch not connected, skipping indexing');
      return;
    }

    try {
      await this.client.index({
        index,
        id,
        document,
        refresh: false, // Don't wait for refresh
      });
      this.logger.debug(`Indexed document ${id} to ${index}`);
    } catch (error) {
      this.logger.error(`Failed to index document to ${index}:`, error.message);
    }
  }

  /**
   * Bulk index multiple documents
   */
  async bulkIndex(index: string, documents: Array<{ id: string; doc: any }>): Promise<void> {
    if (!this.isConnected || !documents || documents.length === 0) {
      return;
    }

    try {
      const operations = documents.flatMap(({ id, doc }) => [
        { index: { _index: index, _id: id } },
        doc,
      ]);

      const result = await this.client.bulk({
        operations,
        refresh: false,
      });

      if (result.errors) {
        const errorCount = result.items.filter((item: any) => item.index?.error).length;
        this.logger.warn(`Bulk index to ${index}: ${errorCount} errors out of ${documents.length}`);
      } else {
        this.logger.debug(`Bulk indexed ${documents.length} documents to ${index}`);
      }
    } catch (error) {
      this.logger.error(`Failed to bulk index to ${index}:`, error.message);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.delete({
        index,
        id,
      });
      this.logger.debug(`Deleted document ${id} from ${index}`);
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        this.logger.error(`Failed to delete document from ${index}:`, error.message);
      }
    }
  }

  /**
   * Check if Elasticsearch is connected
   */
  isElasticsearchConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get Elasticsearch client (for advanced queries)
   */
  getClient(): Client | null {
    return this.isConnected ? this.client : null;
  }
}

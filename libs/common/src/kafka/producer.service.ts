import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import * as fs from 'fs';
import * as path from 'path';
import { CameraOccupancyDocument } from './camera-occupancy.types';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const broker = this.configService.get<string>('kafka.broker') || 'localhost:9092';
    const clientId = this.configService.get<string>('kafka.clientId') || 'vision-ops-producer';
    const connectionTimeout = this.configService.get<number>('kafka.connectionTimeout', 3000);
    const requestTimeout = this.configService.get<number>('kafka.requestTimeout', 30000);
    const retryConfig = this.configService.get<any>('kafka.retry', {
      retries: 5,
      initialRetryTime: 100,
      multiplier: 2,
    });

    this.kafka = new Kafka({
      clientId,
      brokers: broker.split(',').map((b) => b.trim()),
      connectionTimeout,
      requestTimeout,
      logLevel: 2, // WARN level - reduces verbose error logs
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      retry: {
        retries: retryConfig.retries || 5,
        initialRetryTime: retryConfig.initialRetryTime || 100,
        multiplier: retryConfig.multiplier || 2,
      },
    });
  }

  async onModuleInit() {
    this.connectWithRetry().catch((error) => {
      this.logger.warn('Kafka producer will retry connection in background', error.message);
    });
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * After connect, produce camera occupancy from vision-ops-camera.json once.
   */
  private startCameraOccupancyProduce() {
    setTimeout(
      () =>
        this.produceCameraOccupancyFromFile().catch((e) =>
          this.logger.error('Camera occupancy produce failed', e),
        ),
      5000,
    );
  }

  private async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
      this.isConnected = false;
      return false;
    }
  }

  private async connectWithRetry() {
    const maxRetries = this.configService.get<number>('kafka.retry.retries', 5);
    const initialRetryTime = this.configService.get<number>('kafka.retry.initialRetryTime', 100);
    const multiplier = this.configService.get<number>('kafka.retry.multiplier', 2);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const connected = await this.connect();
      if (connected) {
        this.startCameraOccupancyProduce();
        return;
      }

      if (attempt < maxRetries - 1) {
        const retryTime = initialRetryTime * Math.pow(multiplier, attempt);
        this.logger.warn(
          `Kafka producer connection failed. Retrying in ${retryTime}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryTime));
      }
    }

    this.logger.error(
      `Kafka producer failed to connect after ${maxRetries} attempts. Will continue retrying in background.`,
    );
    // Continue retrying in background
    setTimeout(() => this.connectWithRetry(), 10000);
  }

  private async disconnect() {
    try {
      if (this.producer && this.isConnected) {
        await this.producer.disconnect();
        this.isConnected = false;
        this.logger.log('Kafka producer disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer', error);
    }
  }

  /**
   * Ensure connection is established with retry
   */
  private async ensureConnection(maxRetries = 3): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const connected = await this.connect();
      if (connected) {
        return true;
      }

      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1); // 1s, 2s, 3s
        this.logger.warn(`Connection attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    return false;
  }

  /**
   * Read vision-ops-camera.json and produce each document to the camera occupancy topic.
   * Called once on startup (delayed) so consumer can index into vision-ops-camera.
   */
  async produceCameraOccupancyFromFile(filePath?: string): Promise<{ success: number; failed: number }> {
    const relativePath = this.configService.get<string>('kafka.producer.cameraOccupancyDataPath') ?? 'data/vision-ops-camera.json';
    const resolvedPath = filePath ?? path.resolve(process.cwd(), relativePath);

    if (!fs.existsSync(resolvedPath)) {
      this.logger.warn(`Camera occupancy file not found: ${resolvedPath}`);
      return { success: 0, failed: 0 };
    }

    const connected = await this.ensureConnection(5);
    if (!connected) {
      this.logger.warn('Kafka producer not connected; skipping camera occupancy produce');
      return { success: 0, failed: 0 };
    }

    const topic = this.configService.get<string>('kafka.topics.cameraOccupancy') ?? 'visionops.camera.occupancy.v1';
    let success = 0;
    let failed = 0;

    try {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const docs: CameraOccupancyDocument[] = JSON.parse(raw);
      if (!Array.isArray(docs) || docs.length === 0) {
        this.logger.warn('Camera occupancy file has no array or empty array');
        return { success: 0, failed: 0 };
      }

      for (const doc of docs) {
        try {
          await this.producer.send({
            topic,
            messages: [{ key: doc.camera_id ?? doc.client_id, value: JSON.stringify(doc) }],
          });
          success++;
        } catch (err) {
          failed++;
          this.logger.error(`Failed to produce camera occupancy for camera_id=${doc.camera_id}`, err);
        }
      }
      this.logger.log(`Camera occupancy: produced ${success} messages to ${topic}, failed=${failed}`);
    } catch (err: any) {
      this.logger.error(`Error reading/parsing camera occupancy file: ${err.message}`, err);
      return { success, failed };
    }

    return { success, failed };
  }

}

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private readonly DEFAULT_TTL = 60;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisConfig = this.configService.get('REDIS');
    if (redisConfig?.host) {
      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true,
      });
      this.logger.log('Redis client initialized');
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.quit();
      this.logger.log('Redis client connection closed');
    }
  }

  async set<T = any>(
    key: string,
    value: T,
    ttlSeconds: number = this.DEFAULT_TTL,
  ): Promise<void> {
    if (!this.client) return;
    const data = JSON.stringify(value);
    await this.client.set(key, data, 'EX', ttlSeconds);
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (this.client) await this.client.del(key);
  }
}

import { registerAs } from '@nestjs/config';

export const REDIS_CONFIG = registerAs('REDIS', () => ({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  password: process.env['REDIS_PASSWORD'] || undefined,
  db: parseInt(process.env['REDIS_DB'] || '0', 10),
  keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'tv:',
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  maxLoadingTimeout: 10000,
}));

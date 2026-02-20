import { registerAs } from '@nestjs/config';

export const MONGODB_CONFIG = registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vision_ops',
  dbName: process.env.MONGODB_DB ?? 'vision_ops',
}));

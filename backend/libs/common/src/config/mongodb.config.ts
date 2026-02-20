import { registerAs } from '@nestjs/config';

export const MONGODB_CONFIG = registerAs('MONGODB', () => ({
  uri: process.env['MONGO_URI'] || 'mongodb://localhost:27017/traffic_violation',
  db: process.env['MONGO_DB'] || 'traffic_violation',
}));

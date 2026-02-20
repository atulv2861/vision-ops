import { registerAs } from '@nestjs/config';

export const KAFKA_CONFIG = registerAs('kafka', () => ({
  broker: process.env.KAFKA_BROKER ?? 'localhost:9092',
  clientId: process.env.KAFKA_CLIENT_ID ?? 'vision-ops-consumer',
  groupId: process.env.KAFKA_GROUP_ID ?? 'vision-ops-group',
  connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT ?? '3000', 10),
  requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT ?? '30000', 10),
  retry: {
    retries: parseInt(process.env.KAFKA_RETRIES ?? '5', 10),
    initialRetryTime: parseInt(process.env.KAFKA_INITIAL_RETRY_TIME ?? '100', 10),
    multiplier: parseFloat(process.env.KAFKA_RETRY_MULTIPLIER ?? '2'),
  },
  topics: {
    cameraStatus: process.env.KAFKA_TOPIC_CAMERA_STATUS || 'camera_status',
    peopleDistribution:
      process.env.KAFKA_TOPIC_PEOPLE_DISTRIBUTION || 'people_distribution',
  },
}));

import { registerAs } from '@nestjs/config';

export const ELASTICSEARCH_CONFIG = registerAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_NODE ?? 'http://34.173.116.41:9200',
  username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
  password: process.env.ELASTICSEARCH_PASSWORD ?? 'variphi@2024',
  cameraStatusIndex: process.env.ELASTICSEARCH_CAMERA_STATUS_INDEX ?? 'camera_status',
  peopleDistributionIndex:
    process.env.ELASTICSEARCH_PEOPLE_DISTRIBUTION_INDEX ?? 'people_distribution',
  requestTimeout: parseInt(
    process.env.ELASTICSEARCH_REQUEST_TIMEOUT ?? '30000',
    10,
  ),
}));

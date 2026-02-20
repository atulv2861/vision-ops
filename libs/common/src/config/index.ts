import { APP_CONFIG } from './app.config';
import { KAFKA_CONFIG } from './kafka.config';
import { FILTER_CONFIG } from './filter.config';
import { ELASTICSEARCH_CONFIG } from './elasticsearch.config';
import { MONGODB_CONFIG } from './mongodb.config';

const configuration = [
  APP_CONFIG,
  KAFKA_CONFIG,
  FILTER_CONFIG,
  ELASTICSEARCH_CONFIG,
  MONGODB_CONFIG,
];

export { configuration };
export { APP_CONFIG, APP_CONFIG as appConfig } from './app.config';
export { KAFKA_CONFIG } from './kafka.config';
export { FILTER_CONFIG } from './filter.config';
export { ELASTICSEARCH_CONFIG } from './elasticsearch.config';
export { MONGODB_CONFIG } from './mongodb.config';
export { ConfigModule } from './config.module';

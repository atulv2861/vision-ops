import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
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

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
  ],
})
export class ConfigModule {}

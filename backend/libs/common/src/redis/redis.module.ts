import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { REDIS_CONFIG } from '../config/redis.config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(REDIS_CONFIG)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

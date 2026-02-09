import { Module } from '@nestjs/common';
import { ConfigModule } from '../libs/common/src/config';
import { HealthModule } from './modules/health';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from '../libs/common/src/kafka';

@Module({
  imports: [ConfigModule, HealthModule, KafkaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

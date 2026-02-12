import { Module } from '@nestjs/common';
import { ConfigModule, KafkaModule } from '../libs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health';
import { OverviewModule } from './overview';
import { EventsModule } from './events/events.module';

@Module({
  imports: [ConfigModule, KafkaModule, HealthModule, OverviewModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

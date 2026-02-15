import { Module } from '@nestjs/common';
import { ConfigModule, KafkaModule } from '../libs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { FilterModule } from './filter';
import { HealthModule } from './health';
import { OverviewModule } from './overview';

@Module({
  imports: [ConfigModule, KafkaModule, HealthModule, OverviewModule, EventsModule, FilterModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '../libs/common/src/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from '../libs/common/src/kafka';
import { OverviewModule } from './overview';
import { EventsModule } from './events/events.module';
import { CamerasModule } from './cameras/cameras.module';

@Module({
  imports: [ConfigModule, KafkaModule, OverviewModule, EventsModule, CamerasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

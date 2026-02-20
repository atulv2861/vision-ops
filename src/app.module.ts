import { Module } from '@nestjs/common';
import { ConfigModule, KafkaModule } from '../libs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { FilterModule } from './filter';
import { HealthModule } from './health';
import { OverviewModule } from './overview';

import { StudentsModule } from './students/students.module';
import { SpaceModule } from './space-utilization/space.module';
import { DataPipelineModule } from './data-pipeline/data-pipeline.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    KafkaModule, HealthModule, OverviewModule, EventsModule, FilterModule, StudentsModule, SpaceModule, DataPipelineModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

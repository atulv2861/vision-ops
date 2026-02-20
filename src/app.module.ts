import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule as VisionOpsConfigModule, KafkaModule } from '../libs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CameraModule } from './camera';
import { FilterModule } from './filter';
import { OverviewModule } from './overview';
import { StudentsModule } from './students';

@Module({
  imports: [
    VisionOpsConfigModule,
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri') ?? 'mongodb://localhost:27017/vision_ops',
        dbName: config.get<string>('mongodb.dbName') ?? 'vision_ops',
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    CameraModule,
    OverviewModule,
    FilterModule,
    StudentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

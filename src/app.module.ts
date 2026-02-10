import { Module } from '@nestjs/common';
import { ConfigModule } from '../libs/common/src/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from '../libs/common/src/kafka';
import { OverviewModule } from './overview';

import { SeederModule } from './seeder/seeder.module';

@Module({
  imports: [ConfigModule, KafkaModule, OverviewModule, SeederModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

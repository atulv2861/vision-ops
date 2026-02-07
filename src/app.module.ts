import { Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { HealthModule } from './modules/health';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

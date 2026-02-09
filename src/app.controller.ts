import { Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { KafkaProducerService } from '../libs/common/src/kafka';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('kafka/produce-csv')
  async produceFromCsv(@Query('filePath') filePath?: string) {
    return this.kafkaProducerService.produceFromCsv(filePath);
  }
}

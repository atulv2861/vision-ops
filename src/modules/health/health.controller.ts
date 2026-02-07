import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getRoot(): { name: string; version: string; status: string } {
    return this.healthService.getRoot();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.healthService.getHealth();
  }
}

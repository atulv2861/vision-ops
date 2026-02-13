import { Controller, Get, Query, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { OverviewService } from './overview.service';

@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) { }

  @Get('overview-cards')
  async getOverviewCards() {
    return this.overviewService.getSummary();
  }

  // @Get('ai-patterns')
  // async getAiPattern() {
  //   return this.overviewService.getAiPattern();
  // }

  @Get('camera-network-status')
  async getCameraNetworkStatus() {
    return this.overviewService.getCameraNetworkStatus();
  }

  @Get('campus-traffic')
  async getCampusTraffic() {
    return this.overviewService.getCampusTraffic();
  }

  @Get('space-utilization')
  async getSpaceUtilization() {
    return this.overviewService.getSpaceUtilization();
  }

  @Get('security-access')
  async getSecurityAccess() {
    return this.overviewService.getGateSecurityStatus();
  }

  @Get('active-alerts')
  async getActiveAlerts(@Query('limit') limit?: number) {
    return this.overviewService.getActiveAlerts(limit ? Number(limit) : 5);
  }
}

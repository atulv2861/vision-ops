import { Controller, Get, Query, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { OverviewService } from './overview.service';

@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) { }

  @Get('overview-cards')
  async getOverviewCards(
    @Query('client_id') client_id: string,
    @Query('camera_id') camera_id: string,
    @Query('location_id') location_id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.overviewService.getSummary(client_id, location_id, from, to, camera_id);
  }

  @Get('ai-patterns')
  async getAiPattern() {
    return this.overviewService.getAiPatterns();
  }

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
  
}

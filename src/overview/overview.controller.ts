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
  async getAiPattern(
    @Query('client_id') client_id: string,
    @Query('camera_id') camera_id: string,
    @Query('location_id') location_id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.overviewService.getAiPatterns(client_id, camera_id, location_id, from, to);
  }

  @Get('camera-network-status')
  async getCameraNetworkStatus(
    @Query('client_id') client_id: string,
    @Query('camera_id') camera_id: string,
    @Query('location_id') location_id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.overviewService.getCameraNetworkStatus(client_id, camera_id, location_id, from, to);
  }

  @Get('campus-traffic')
  async getCampusTraffic(
    @Query('client_id') client_id: string,
    @Query('camera_id') camera_id: string,
    @Query('location_id') location_id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.overviewService.getCampusTraffic(client_id, camera_id, location_id, from, to);
  }

  @Get('space-utilization')
  async getSpaceUtilization(
    @Query('client_id') client_id: string,
    @Query('camera_id') camera_id: string,
    @Query('location_id') location_id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.overviewService.getSpaceUtilization(client_id, camera_id, location_id, from, to);
  }

  @Get('security-access')
  async getSecurityAccess(
    @Query('client_id') client_id: string,
    @Query('camera_id') camera_id: string,
    @Query('location_id') location_id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.overviewService.getGateSecurityStatus(client_id, camera_id, location_id, from, to);
  }
  
}

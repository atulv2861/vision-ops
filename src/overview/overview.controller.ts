import { Controller, Get, Query, Body, BadRequestException, Post } from '@nestjs/common';
import { OverviewService } from './overview.service';
import {
  RequestQueryDto,
  RequestBodyDto,
} from '../../libs/common/src/dto';

@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Post('overview-cards')
  async getOverviewCards(
    @Query() query: RequestQueryDto,
    @Body() body: RequestBodyDto,
  ) {
    if (!body?.camera_ids?.length) {
      throw new BadRequestException('Body parameter camera_ids is required and must contain at least one id');
    }
    return this.overviewService.getSummary(
      query.client_id,
      query.from,
      query.to,
      body.camera_ids,
    );
  }

  @Post('ai-patterns')
  async getAiPattern(
    @Query() query: RequestQueryDto,
    @Body() body: RequestBodyDto,
  ) {
    return this.overviewService.getAiPatterns(
      query.client_id,
      query.from,
      query.to,
      body?.camera_ids ?? [],
    );
  }

  @Post('camera-network-status')
  async getCameraNetworkStatus(
    @Query() query: RequestQueryDto,
    @Body() body: RequestBodyDto,
  ) {
    return this.overviewService.getCameraNetworkStatus(
      query.client_id,
      query.from,
      query.to,
      body.camera_ids ?? [],
    );
  }

  @Post('campus-traffic')
  async getCampusTraffic(
    @Query() query: RequestQueryDto,
    @Body() body: RequestBodyDto,
  ) {
    return this.overviewService.getCampusTraffic(
      query.client_id,
      query.from,
      query.to,
      body.camera_ids ?? [],
    );
  }

  @Post('space-utilization')
  async getSpaceUtilization(
    @Query() query: RequestQueryDto,
    @Body() body: RequestBodyDto,
  ) {
    return this.overviewService.getSpaceUtilization(
      query.client_id,
      query.from,
      query.to,
      body.camera_ids ?? [],
    );
  }

  @Post('security-access')
  async getSecurityAccess(
    @Query() query: RequestQueryDto,
    @Body() body: RequestBodyDto,
  ) {
    return this.overviewService.getGateSecurityStatus(
      query.client_id,
      query.from,
      query.to,
      body.camera_ids ?? [],
    );
  }
}

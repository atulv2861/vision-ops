import { Controller, Get, Query, BadRequestException, Req, Body, Post } from '@nestjs/common';
import { FilterService } from './filter.service';

@Controller('filter')
export class FilterController {
  constructor(private readonly filterService: FilterService) {}

  @Get('location')
  async getLocation(
    @Query('client_id') client_id: string,
  ) {
    if (!client_id) {
      throw new BadRequestException('Query parameter client_id is required');
    }
    return this.filterService.getCameraLocation();
  }

  @Post("cameras")
  async getCamerasByLocation(
    @Body("location_ids") location_ids: string[],
  ) {
    if (location_ids.length === 0) {
      throw new BadRequestException('Body parameter location_ids is required');
    }
    return this.filterService.getCameraByLocation(location_ids);
  }
}

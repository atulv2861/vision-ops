import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
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

  @Get("camera")
  async getCameraByLocation(
    @Query('location_id') location_id: string,
  ) {
    if (!location_id) {
      throw new BadRequestException('Query parameter location_id is required');
    }
    return this.filterService.getCameraByLocation(location_id);
  }
}

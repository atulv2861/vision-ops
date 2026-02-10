import { Controller, Get, Query, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) { }

  @Get()
  async getAll(
    @Query('from') from?: number,
    @Query('size') size?: number,
    @Query('sort') sort?: string,
  ) {
    return this.overviewService.getAllEvents({
      from: from ? parseInt(from.toString(), 10) : 0,
      size: size ? parseInt(size.toString(), 10) : 100,
      sort: sort || 'timestamp:desc',
    });
  }

  @Get('search')
  async search(
    @Query('q') query?: string,
    @Query('event_type') eventType?: string,
    @Query('severity') severity?: string,
    @Query('zone_id') zoneId?: string,
    @Query('from') from?: number,
    @Query('size') size?: number,
  ) {
    return this.overviewService.searchEvents({
      query,
      eventType,
      severity,
      zoneId,
      from: from ? parseInt(from.toString(), 10) : 0,
      size: size ? parseInt(size.toString(), 10) : 100,
    });
  }

  @Get('dashboard')
  async getDashboard() {
    //return this.overviewService.getDashboardMetrics();
  }

  @Get('stats')
  async getStats() {
    return this.overviewService.getStats();
  }

  @Get('by-event-type')
  async getByEventType(@Query('event_type') eventType: string) {
    return this.overviewService.getByEventType(eventType);
  }

  @Get('by-zone')
  async getByZone(@Query('zone_id') zoneId: string) {
    return this.overviewService.getByZone(zoneId);
  }

  @Get('summary')
  async getSummary() {
    return this.overviewService.getSummary();
  }

  @Post('ingest')
  @UseInterceptors(FileInterceptor('file'))
  async ingestEvents(@UploadedFile() file: any) { // Using 'any' for simplicity or strictly type if Express types avail
    if (!file) return { message: 'No file uploaded' };
    return this.overviewService.ingestOverviewData(file.buffer);
  }

  @Get('space-utilization')
  async getSpaceUtilization() {
    return this.overviewService.getSpaceUtilization();
  }
}

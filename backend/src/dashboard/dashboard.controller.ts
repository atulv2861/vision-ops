import { Controller, Get, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(private readonly dashboardService: DashboardService) { }

    @Get('map-data')
    @ApiOperation({ summary: 'Get map visualization data with violation counts by location' })
    @ApiResponse({ status: 200, description: 'Location hotspots with violation counts and coordinates' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getMapData(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('timezoneOffset') timezoneOffset?: string,
    ) {
        try {
            const offset = timezoneOffset ? parseInt(timezoneOffset, 10) : 0;
            return await this.dashboardService.getMapData(startDate, endDate, offset);
        } catch (error) {
            this.logger.error('Failed to fetch map data', error.stack);
            throw new HttpException('Failed to fetch map data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

import { Controller, Get, Query } from '@nestjs/common';
import { SpaceService } from './space-service';

@Controller('space-utilization')
export class SpaceController {
    constructor(private readonly spaceService: SpaceService) { }

    @Get('analytics')
    async getSpaceAnalytics(
        @Query('range') range: string = 'today',
    ) {
        return this.spaceService.getSpaceAnalytics(range);
    }

    @Get('occupancy-comparison')
    async getOccupancyComparison(
        @Query('client_id') client_id: string,
        @Query('location_id') location_id: string,
        @Query('camera_id') camera_id?: string,
    ) {
        return this.spaceService.getOccupancyComparison(client_id, location_id, camera_id);
    }

    @Get()
    async getSpaceUtilization(
        @Query('client_id') client_id: string,
        @Query('location_id') location_id: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('camera_id') camera_id?: string,
    ) {
        return this.spaceService.getSpaceUtilization(
            client_id,
            location_id,
            from,
            to,
            camera_id,
        );
    }
}

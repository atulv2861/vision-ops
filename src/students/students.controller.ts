import { Controller, Get, Query } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Get('overview-cards')
    async getOverviewCards(
        @Query('client_id') client_id: string,
        @Query('camera_id') camera_id: string,
        @Query('location_id') location_id: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.studentsService.getSummary(client_id, location_id, from, to, camera_id);
    }

    @Get('hourly-presence')
    async getHourlyPresence(
        @Query('client_id') client_id: string,
        @Query('camera_id') camera_id: string,
        @Query('location_id') location_id: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.studentsService.getHourlyPresence(client_id, location_id, from, to, camera_id);
    }


}

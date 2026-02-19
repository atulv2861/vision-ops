import { Controller, Get, Query, Body, Post } from '@nestjs/common';
import { StudentsService } from './students.service';
import { RequestQueryDto, RequestBodyDto } from '../../libs/common/src/dto';

@Controller('students')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Post('summary')
    async getSummary(
        @Query() query: RequestQueryDto,
        @Body() body: RequestBodyDto,
    ) {
        return this.studentsService.getSummary(query.client_id, query.from, query.to, body.camera_ids);
    }

    @Post('aggrigate-presence')
    async getHourlyPresence(
        @Query() query: RequestQueryDto,
        @Body() body: RequestBodyDto,
    ) {
        return this.studentsService.getHourlyPresence(query.client_id, query.from, query.to, body.camera_ids);
    }


}
import { Controller, Post, Body } from '@nestjs/common';
import { SeederService } from './seeder.service';

@Controller('seeder')
export class SeederController {
    constructor(private readonly seederService: SeederService) { }

    @Post('start')
    start(@Body('interval') interval?: number) {
        return this.seederService.startContinuousSeeding(interval);
    }

    @Post('stop')
    stop() {
        return this.seederService.stopContinuousSeeding();
    }
}

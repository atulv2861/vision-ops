import { Controller, Get } from '@nestjs/common';
import { CamerasService } from './cameras.service';

@Controller('cameras')
export class CamerasController {
    constructor(private readonly camerasService: CamerasService) { }

    @Get()
    async getAll() {
        return this.camerasService.getAllCameras();
    }

    @Get('metrics')
    async getMetrics() {
        return this.camerasService.getMetrics();
    }
}

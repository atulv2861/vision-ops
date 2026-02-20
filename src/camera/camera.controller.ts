import { Controller, Get } from '@nestjs/common';
import { CameraService } from './camera.service';

@Controller('camera')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Get()
  getCamera() {
    return { message: 'Camera module' };
  }
}

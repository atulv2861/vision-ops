import { Module } from '@nestjs/common';
import { CameraDetailsService } from './camera-details.service';

@Module({
  providers: [CameraDetailsService],
  exports: [CameraDetailsService],
})
export class EnrichmentModule {}

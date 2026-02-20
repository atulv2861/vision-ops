import { Global, Module } from '@nestjs/common';
import { TrimingService } from './triming.service';

@Global()
@Module({
  providers: [TrimingService],
  exports: [TrimingService],
})
export class TrimingModule {}

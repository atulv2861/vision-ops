import { Global, Module } from '@nestjs/common';
import { ZipService } from './zip.service';

@Global()
@Module({
  providers: [ZipService],
  exports: [ZipService],
})
export class ZipModule {}

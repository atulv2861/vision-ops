import { Global, Module } from '@nestjs/common';
import { GCPService } from './gcp.service';

@Global()
@Module({
  providers: [GCPService],
  exports: [GCPService],
})
export class GCPModule {}

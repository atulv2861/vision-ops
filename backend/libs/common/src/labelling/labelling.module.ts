import { Global, Module } from '@nestjs/common';
import { LabellingService } from './labelling.service';

@Global()
@Module({
  providers: [LabellingService],
  exports: [LabellingService],
})
export class LabellingModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';
import { ViolationsConsumerService } from './violations-consumer.service';
import { Violation, ViolationSchema } from './schemas/violation.schema';

import { ElasticModule } from '@app/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Violation.name, schema: ViolationSchema }]),
    ElasticModule,
  ],
  controllers: [ViolationsController],
  providers: [ViolationsService, ViolationsConsumerService],
  exports: [ViolationsService],
})
export class ViolationsModule { }

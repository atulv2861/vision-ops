import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { OverviewConsumerService } from './overview-consumer.service';
import { PeopleDistribution, PeopleDistributionSchema } from './schemas/people-distribution.schema';
import { ElasticModule, UtilsModule, EnrichmentModule } from '../../libs/common';

@Module({
  imports: [
    ElasticModule,
    UtilsModule,
    EnrichmentModule,
    MongooseModule.forFeature([
      { name: PeopleDistribution.name, schema: PeopleDistributionSchema },
    ]),
  ],
  controllers: [OverviewController],
  providers: [OverviewService, OverviewConsumerService],
  exports: [OverviewService],
})
export class OverviewModule {}

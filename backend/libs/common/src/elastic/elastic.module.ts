import { Global, Module } from '@nestjs/common';
import { ElasticService } from './elastic.service';
import { ElasticsearchQueryService } from './elasticsearch-query.service';

@Global()
@Module({
  providers: [ElasticService, ElasticsearchQueryService],
  exports: [ElasticService, ElasticsearchQueryService],
})
export class ElasticModule { }

import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { SeederController } from './seeder.controller';
import { ElasticModule } from '../../libs/common/src/elastic/elastic.module';

@Module({
    imports: [ElasticModule],
    controllers: [SeederController],
    providers: [SeederService],
})
export class SeederModule { }

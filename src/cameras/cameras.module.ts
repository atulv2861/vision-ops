import { Module } from '@nestjs/common';
import { CamerasController } from './cameras.controller';
import { CamerasService } from './cameras.service';
import { ElasticModule } from '../../libs/common/src/elastic/elastic.module'; // Assuming ElasticModule exists, or needs to be imported from common

@Module({
    imports: [ElasticModule], // Depending on how ElasticService is provided
    controllers: [CamerasController],
    providers: [CamerasService],
})
export class CamerasModule { }

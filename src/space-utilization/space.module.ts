import { Module } from '@nestjs/common';
import { SpaceController } from './space.controller';
import { SpaceService } from './space-service';
import { ElasticModule, UtilsModule } from '../../libs/common';

@Module({
    imports: [ElasticModule, UtilsModule],
    controllers: [SpaceController],
    providers: [SpaceService],
    exports: [SpaceService],
})
export class SpaceModule { }

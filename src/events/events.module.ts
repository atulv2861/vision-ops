import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { ElasticModule } from '../../libs/common/src/elastic/elastic.module';

@Module({
    imports: [ElasticModule],
    controllers: [EventsController],
    providers: [EventsService],
})
export class EventsModule { }

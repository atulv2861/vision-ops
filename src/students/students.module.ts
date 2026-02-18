import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { ElasticModule, UtilsModule } from '../../libs/common';

@Module({
    imports: [ElasticModule, UtilsModule],
    controllers: [StudentsController],
    providers: [StudentsService],
    exports: [StudentsService],
})
export class StudentsModule { }

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Violation, ViolationSchema } from '../violations/schemas/violation.schema';
import { Camera, CameraSchema } from '../reference/schemas/camera.schema';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Violation.name, schema: ViolationSchema },
            { name: Camera.name, schema: CameraSchema },
        ]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule { }

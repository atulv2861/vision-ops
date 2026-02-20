import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleConfigController } from './vehicle-config.controller';
import { VehicleConfigService } from './vehicle-config.service';
import { VehicleConfig, VehicleConfigSchema } from './schemas/vehicle-config.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: VehicleConfig.name, schema: VehicleConfigSchema },
        ]),
    ],
    controllers: [VehicleConfigController],
    providers: [VehicleConfigService],
    exports: [VehicleConfigService], // Export for use in OperationsModule
})
export class VehicleConfigModule { }

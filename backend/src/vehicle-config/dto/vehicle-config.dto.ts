import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleConfigDto {
    @ApiProperty({ example: 'Car', description: 'Type of vehicle' })
    @IsString()
    vehicleType: string;

    @ApiProperty({ example: 20, description: 'Dwell time limit in minutes for this vehicle type' })
    @IsNumber()
    @Min(0)
    dwellTimeLimit: number;

    @ApiPropertyOptional({ example: 'Standard passenger car', description: 'Optional description' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class UploadVehicleConfigsDto {
    @ApiProperty({ type: [VehicleConfigDto], description: 'Array of vehicle configurations' })
    configs: VehicleConfigDto[];
}

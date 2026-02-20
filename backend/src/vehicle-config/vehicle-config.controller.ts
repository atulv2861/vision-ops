import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    Logger,
    HttpException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { VehicleConfigService } from './vehicle-config.service';
import { VehicleConfigDto } from './dto/vehicle-config.dto';

@ApiTags('vehicle-config')
@Controller('vehicle-config')
export class VehicleConfigController {
    private readonly logger = new Logger(VehicleConfigController.name);

    constructor(private readonly vehicleConfigService: VehicleConfigService) { }

    @Get()
    @ApiOperation({ summary: 'Get all vehicle configurations' })
    @ApiResponse({
        status: 200,
        description: 'List of all vehicle configurations',
    })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findAll() {
        try {
            return await this.vehicleConfigService.findAll();
        } catch (error) {
            this.logger.error('Failed to fetch vehicle configurations', error.stack);
            throw new HttpException('Failed to fetch vehicle configurations', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':vehicleType')
    @ApiOperation({ summary: 'Get a specific vehicle configuration' })
    @ApiParam({ name: 'vehicleType', example: 'Car' })
    @ApiResponse({
        status: 200,
        description: 'Vehicle configuration found',
    })
    @ApiResponse({
        status: 404,
        description: 'Vehicle configuration not found',
    })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findOne(@Param('vehicleType') vehicleType: string) {
        try {
            return await this.vehicleConfigService.findOne(vehicleType);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error(`Failed to fetch vehicle configuration for ${vehicleType}`, error.stack);
            throw new HttpException('Failed to fetch vehicle configuration', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post()
    @ApiOperation({ summary: 'Create or update a vehicle configuration' })
    @ApiBody({ type: VehicleConfigDto })
    @ApiResponse({
        status: 201,
        description: 'Vehicle configuration created/updated',
    })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async upsert(@Body() dto: VehicleConfigDto) {
        try {
            return await this.vehicleConfigService.upsert(dto);
        } catch (error) {
            this.logger.error('Failed to upsert vehicle configuration', error.stack);
            throw new HttpException('Failed to upsert vehicle configuration', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('upload')
    @ApiOperation({ summary: 'Bulk upload vehicle configurations from JSON' })
    @ApiBody({
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    vehicleType: { type: 'string', example: 'Car' },
                    dwellTimeLimit: { type: 'number', example: 20 },
                    description: { type: 'string', example: 'Standard passenger car' },
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Configurations uploaded successfully',
    })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @HttpCode(HttpStatus.OK)
    async upload(@Body() configs: VehicleConfigDto[]) {
        try {
            return await this.vehicleConfigService.uploadConfigs(configs);
        } catch (error) {
            this.logger.error('Failed to upload vehicle configurations', error.stack);
            throw new HttpException('Failed to upload vehicle configurations', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':vehicleType')
    @ApiOperation({ summary: 'Delete a vehicle configuration' })
    @ApiParam({ name: 'vehicleType', example: 'Car' })
    @ApiResponse({
        status: 204,
        description: 'Vehicle configuration deleted',
    })
    @ApiResponse({
        status: 404,
        description: 'Vehicle configuration not found',
    })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('vehicleType') vehicleType: string) {
        try {
            return await this.vehicleConfigService.delete(vehicleType);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error(`Failed to delete vehicle configuration for ${vehicleType}`, error.stack);
            throw new HttpException('Failed to delete vehicle configuration', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

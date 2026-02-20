import { Controller, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';

@ApiTags('reference')
@Controller('reference')
export class ReferenceController {
  private readonly logger = new Logger(ReferenceController.name);

  constructor(private readonly referenceService: ReferenceService) { }

  @Get('cameras')
  @ApiOperation({ summary: 'List all cameras' })
  @ApiResponse({ status: 200, description: 'List of cameras' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCameras() {
    try {
      return await this.referenceService.getCameras();
    } catch (error) {
      this.logger.error('Failed to fetch cameras', error.stack);
      throw new HttpException('Failed to fetch cameras', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('zones')
  @ApiOperation({ summary: 'List all zones' })
  @ApiResponse({ status: 200, description: 'List of zones' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getZones() {
    try {
      return await this.referenceService.getZones();
    } catch (error) {
      this.logger.error('Failed to fetch zones', error.stack);
      throw new HttpException('Failed to fetch zones', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'List bottleneck zones' })
  @ApiResponse({ status: 200, description: 'List of bottlenecks' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getBottlenecks() {
    try {
      return await this.referenceService.getBottlenecks();
    } catch (error) {
      this.logger.error('Failed to fetch bottlenecks', error.stack);
      throw new HttpException('Failed to fetch bottlenecks', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { Controller, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FlowService } from './flow.service';

@ApiTags('flow')
@Controller('flow')
export class FlowController {
  private readonly logger = new Logger(FlowController.name);

  constructor(private readonly flowService: FlowService) { }

  @Get()
  @ApiOperation({ summary: 'Get all flow data (zones, alerts, congestion)' })
  @ApiResponse({ status: 200, description: 'All flow data grouped by type' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllFlowData() {
    try {
      return await this.flowService.getAllFlowData();
    } catch (error) {
      this.logger.error('Failed to get all flow data', error.stack);
      throw new HttpException('Failed to get all flow data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get flow zones' })
  @ApiResponse({ status: 200, description: 'List of flow zones' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getFlowZones() {
    try {
      return await this.flowService.getFlowZones();
    } catch (error) {
      this.logger.error('Failed to get flow zones', error.stack);
      throw new HttpException('Failed to get flow zones', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get flow alerts' })
  @ApiResponse({ status: 200, description: 'List of active flow alerts' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getFlowAlerts() {
    try {
      return await this.flowService.getFlowAlerts();
    } catch (error) {
      this.logger.error('Failed to get flow alerts', error.stack);
      throw new HttpException('Failed to get flow alerts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('congestion')
  @ApiOperation({ summary: 'Get congestion time series' })
  @ApiResponse({ status: 200, description: 'Congestion data over time' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCongestionTimeseries() {
    try {
      return await this.flowService.getCongestionTimeseries();
    } catch (error) {
      this.logger.error('Failed to get congestion timeseries', error.stack);
      throw new HttpException('Failed to get congestion timeseries', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

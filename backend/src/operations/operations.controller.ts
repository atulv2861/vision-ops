import { Controller, Get, Query, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OperationsService } from './operations.service';

@ApiTags('operations')
@Controller('journeys')
export class OperationsController {
  private readonly logger = new Logger(OperationsController.name);

  constructor(private readonly operationsService: OperationsService) { }

  @Get()
  @ApiOperation({ summary: 'List journeys' })
  @ApiResponse({ status: 200, description: 'List of journeys' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getJourneys(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100;

      // Validate limit parameter
      if (limit && (isNaN(limitNum) || limitNum < 1)) {
        throw new HttpException(
          'Invalid limit parameter. Must be a positive number.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Fetching journeys with limit: ${limitNum}`);
      return await this.operationsService.getJourneys(limitNum);
    } catch (error) {
      // Re-throw HttpException as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error('Failed to fetch journeys', error.stack);
      throw new HttpException(
        'Failed to fetch journeys. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Get bottleneck zones calculated from journey data' })
  @ApiResponse({ status: 200, description: 'List of calculated bottlenecks' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getBottlenecks(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;

      // Validate limit parameter
      if (limit && (isNaN(limitNum) || limitNum < 1)) {
        throw new HttpException(
          'Invalid limit parameter. Must be a positive number.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Fetching bottlenecks with limit: ${limitNum}`);
      return await this.operationsService.getBottlenecks(limitNum);
    } catch (error) {
      // Re-throw HttpException as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error('Failed to fetch bottlenecks', error.stack);
      throw new HttpException(
        'Failed to fetch bottlenecks. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':journeyId/details')
  @ApiOperation({ summary: 'Get detailed journey information including timeline and violations' })
  @ApiResponse({ status: 200, description: 'Journey details with timeline and violations' })
  @ApiResponse({ status: 400, description: 'Invalid journey ID' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getJourneyDetails(@Param('journeyId') journeyId: string) {
    try {
      // Validate journeyId parameter
      if (!journeyId || journeyId.trim().length === 0) {
        throw new HttpException(
          'Invalid journey ID. Journey ID cannot be empty.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Fetching journey details for: ${journeyId}`);
      const result = await this.operationsService.getJourneyDetails(journeyId);

      // Check if journey was found
      if (!result || !result.timeline || result.timeline.length === 0) {
        throw new HttpException(
          `Journey with ID "${journeyId}" not found.`,
          HttpStatus.NOT_FOUND,
        );
      }

      return result;
    } catch (error) {
      // Re-throw HttpException as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(`Failed to fetch journey details for ${journeyId}`, error.stack);
      throw new HttpException(
        'Failed to fetch journey details. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ViolationsService } from './violations.service';
import { CreateViolationDto, CreateViolationBulkDto } from './dto/create-violation.dto';
import { UpdateViolationDto } from './dto/update-violation.dto';
import { QueryViolationDto } from './dto/query-violation.dto';
import { SearchViolationsDto } from './dto/search-violations.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { ElasticsearchQueryService } from '@app/common';

@ApiTags('violations')
@Controller('violations')
export class ViolationsController {
  private readonly logger = new Logger(ViolationsController.name);

  constructor(
    private readonly violationsService: ViolationsService,
    private readonly elasticsearchQueryService: ElasticsearchQueryService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a single violation' })
  @ApiResponse({ status: 201, description: 'Violation created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(@Body() dto: CreateViolationDto) {
    try {
      return await this.violationsService.create(dto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to create violation', error.stack);
      throw new HttpException('Failed to create violation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple violations at once' })
  @ApiResponse({ status: 201, description: 'Violations created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createBulk(@Body() body: CreateViolationBulkDto) {
    try {
      return await this.violationsService.createBulk(body.violations);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to create bulk violations', error.stack);
      throw new HttpException('Failed to create bulk violations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List violations with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of violations' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(@Query() query: QueryViolationDto) {
    try {
      return await this.violationsService.findAll(query);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to fetch violations', error.stack);
      throw new HttpException('Failed to fetch violations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search violations using Elasticsearch with advanced filtering' })
  @ApiResponse({ status: 200, description: 'Search results from Elasticsearch' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async searchViolations(@Query() filters: SearchViolationsDto) {
    try {
      const searchFilters = {
        ...filters,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      };
      return await this.elasticsearchQueryService.searchViolations(searchFilters);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to search violations', error.stack);
      throw new HttpException('Failed to search violations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('aggregations')
  @ApiOperation({ summary: 'Get violation aggregations from Elasticsearch for dashboard' })
  @ApiResponse({ status: 200, description: 'Aggregated violation statistics' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAggregations(@Query() filters: DateRangeDto) {
    try {
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
      const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;
      return await this.elasticsearchQueryService.getViolationAggregations(dateFrom, dateTo);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get violation aggregations', error.stack);
      throw new HttpException('Failed to get violation aggregations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview (stats, charts, locations, repeat offenders)' })
  @ApiResponse({ status: 200, description: 'Overview data for dashboard' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getOverview(@Query('date') date?: string) {
    try {
      return await this.violationsService.getOverview(date);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get overview', error.stack);
      throw new HttpException('Failed to get overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('overview-elastic')
  @ApiOperation({ summary: 'Dashboard overview using Elasticsearch (faster, scalable)' })
  @ApiResponse({ status: 200, description: 'Overview data from Elasticsearch' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getOverviewElastic(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('timezoneOffset') timezoneOffset?: string,
  ) {
    try {
      const offset = timezoneOffset ? parseInt(timezoneOffset, 10) : 0;
      return await this.elasticsearchQueryService.getDashboardOverview(startDate, endDate, offset);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get elastic overview', error.stack);
      throw new HttpException('Failed to get elastic overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one violation by id' })
  @ApiResponse({ status: 200, description: 'Violation found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id') id: string) {
    try {
      const violation = await this.violationsService.findOne(id);
      if (!violation) {
        throw new HttpException('Violation not found', HttpStatus.NOT_FOUND);
      }
      return violation;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to find violation ${id}`, error.stack);
      throw new HttpException('Failed to find violation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a violation by id' })
  @ApiResponse({ status: 200, description: 'Violation updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(@Param('id') id: string, @Body() dto: UpdateViolationDto) {
    try {
      return await this.violationsService.update(id, dto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update violation ${id}`, error.stack);
      throw new HttpException('Failed to update violation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a violation by id' })
  @ApiResponse({ status: 200, description: 'Violation deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async remove(@Param('id') id: string) {
    try {
      return await this.violationsService.remove(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to delete violation ${id}`, error.stack);
      throw new HttpException('Failed to delete violation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


}

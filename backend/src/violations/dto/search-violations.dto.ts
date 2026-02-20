import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsArray, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchViolationsDto {
    @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', minimum: 1, default: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 100;

    @ApiPropertyOptional({ description: 'Filter by severity', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    severity?: string[];

    @ApiPropertyOptional({ description: 'Filter by violation type', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    violationType?: string[];

    @ApiPropertyOptional({ description: 'Filter by status', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    status?: string[];

    @ApiPropertyOptional({ description: 'Search by location' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({ description: 'Filter by camera ID' })
    @IsOptional()
    @IsString()
    cameraId?: string;
}

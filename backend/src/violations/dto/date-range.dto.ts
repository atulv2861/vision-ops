import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class DateRangeDto {
    @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}

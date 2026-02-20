import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryViolationDto {
  @ApiPropertyOptional({ example: '2026-02-06' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(23)
  hour?: number;

  @ApiPropertyOptional({ example: 'Mall Road' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Speeding' })
  @IsOptional()
  @IsString()
  violationType?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

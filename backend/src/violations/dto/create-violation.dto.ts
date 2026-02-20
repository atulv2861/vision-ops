import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsOptional,
  Matches,
} from 'class-validator';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const TYPES = ['Helmet', 'Speeding', 'Red Light', 'Triple Riding', 'Wrong Side'] as const;
const SEVERITIES = ['high', 'medium', 'low'] as const;
const STATUSES = ['valid', 'unresolved', 'false_positive', 'acknowledged'] as const;

export class CreateViolationDto {
  @ApiProperty({ example: 'v1' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'id must be alphanumeric with optional - or _' })
  id: string;

  @ApiProperty({ example: '2026-02-06T00:15:00Z' })
  @IsString()
  timestamp: string;

  @ApiProperty({ example: '2026-02-06' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: 0, minimum: 0, maximum: 23 })
  @IsNumber()
  @Min(0)
  @Max(23)
  hour: number;

  @ApiProperty({ example: 'Thu', enum: DAYS })
  @IsString()
  @IsIn(DAYS)
  dayOfWeek: string;

  @ApiProperty({ example: 'Speeding', enum: TYPES })
  @IsString()
  @IsIn(TYPES)
  violationType: string;

  @ApiProperty({ example: 'Mall Road' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'high', enum: SEVERITIES })
  @IsString()
  @IsIn(SEVERITIES)
  severity: string;

  @ApiProperty({ example: 'GS57 NW 0398' })
  @IsString()
  licensePlate: string;

  @ApiProperty({ example: 'cam_01' })
  @IsString()
  cameraId: string;

  @ApiPropertyOptional({ example: 'valid', enum: STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(STATUSES)
  status?: string;
}

export class CreateViolationBulkDto {
  @ApiProperty({ type: [CreateViolationDto] })
  violations: CreateViolationDto[];
}

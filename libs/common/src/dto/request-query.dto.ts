import { IsString, IsOptional } from 'class-validator';

/**
 * Query params for overview endpoints: client_id (required), from/to (optional date range).
 */
export class RequestQueryDto {
  @IsString({ message: 'client_id must be a string' })
  client_id: string;

  @IsOptional()
  @IsString()
  from: string;

  @IsOptional()
  @IsString()
  to: string;
}

import { IsArray, IsString, IsOptional } from 'class-validator';

/**
 * Body for overview endpoints where camera_ids are optional (e.g. ai-patterns, campus-traffic).
 */
export class RequestBodyDto {
  @IsArray()
  @IsString({ each: true })
  camera_ids?: string[];
}

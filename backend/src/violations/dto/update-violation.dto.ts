import { PartialType } from '@nestjs/swagger';
import { CreateViolationDto } from './create-violation.dto';

export class UpdateViolationDto extends PartialType(CreateViolationDto) {}

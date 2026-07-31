import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'ADMIN_REVIEW',
  'LAWYER_REVIEW',
  'APPROVAL_PENDING',
  'SIGNING',
  'SIGNED',
  'REJECTED',
  'CANCELLED',
] as const;

export class ContractFiltersDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  areaId?: number;

  @ApiPropertyOptional({ enum: ['FISICA', 'MORAL'] })
  @IsOptional()
  @IsString()
  providerType?: string;
}

export class CancelContractDto {
  @ApiPropertyOptional({ example: 'El proveedor no cumple requisitos' })
  @IsOptional()
  @IsString()
  reason?: string;
}

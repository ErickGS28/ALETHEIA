import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { DateRangeQueryDto } from './date-range-query.dto';

export class ContractsMetricsQueryDto extends DateRangeQueryDto {
  @ApiProperty({ enum: ContractStatus, example: ContractStatus.REJECTED })
  @IsEnum(ContractStatus)
  status!: ContractStatus;
}

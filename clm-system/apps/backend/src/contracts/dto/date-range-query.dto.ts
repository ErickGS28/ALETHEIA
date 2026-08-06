import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'Fecha de inicio (ISO 8601)' })
  @IsISO8601()
  startDate!: string;

  @ApiProperty({ example: '2026-06-30', description: 'Fecha de fin (ISO 8601)' })
  @IsISO8601()
  endDate!: string;
}

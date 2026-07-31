import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateStageDto {
  @ApiProperty({ example: 'Revisión legal' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ example: 48 })
  @IsInt()
  @Min(0)
  slaHours: number;

  @ApiProperty({ example: 'ABOGADO' })
  @IsString()
  roleRequired: string;
}

export class UpdateStageDto {
  @ApiPropertyOptional({ example: 'Revisión legal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsInt()
  @Min(0)
  slaHours?: number;

  @ApiPropertyOptional({ example: 'ABOGADO' })
  @IsOptional()
  @IsString()
  roleRequired?: string;
}

export class TransitionDto {
  @ApiPropertyOptional({ example: 'Aprobado, todo en orden' })
  @IsOptional()
  @IsString()
  comment?: string;
}

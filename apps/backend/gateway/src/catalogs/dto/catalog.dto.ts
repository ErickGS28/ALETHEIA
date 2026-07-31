import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNamedDto {
  @ApiProperty({ example: 'Compras' })
  @IsString()
  @MinLength(2)
  name: string;
}

export class UpdateNamedDto {
  @ApiPropertyOptional({ example: 'Compras' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateApoderadoDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Poder general para pleitos y cobranzas' })
  @IsString()
  @MinLength(2)
  legalPower: string;
}

export class UpdateApoderadoDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Poder general' })
  @IsOptional()
  @IsString()
  legalPower?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'Contrato de prestación de servicios' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'CONTRATO QUE CELEBRAN...' })
  @IsString()
  content: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Contrato de prestación de servicios' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'CONTRATO QUE CELEBRAN...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

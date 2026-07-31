import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ example: 'Contrato de suministro' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Proveedora del Norte S.A. de C.V.' })
  @IsString()
  @MinLength(2)
  vendorName: string;

  @ApiPropertyOptional({ example: 'ventas@proveedora.com' })
  @IsOptional()
  @IsEmail()
  vendorEmail?: string;

  @ApiProperty({ enum: ['FISICA', 'MORAL'], example: 'MORAL' })
  @IsIn(['FISICA', 'MORAL'])
  providerType: 'FISICA' | 'MORAL';

  @ApiProperty({ example: 1 })
  @IsInt()
  areaId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  societyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  templateId?: number;
}

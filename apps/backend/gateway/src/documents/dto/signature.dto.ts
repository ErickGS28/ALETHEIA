import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSignatureDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  apoderadoId?: number;

  @ApiPropertyOptional({ enum: ['CANVAS', 'ELECTRONIC'], example: 'CANVAS' })
  @IsOptional()
  @IsIn(['CANVAS', 'ELECTRONIC'])
  method?: 'CANVAS' | 'ELECTRONIC';

  @ApiProperty({ example: 'data:image/png;base64,iVBORw0KGgo...' })
  @IsString()
  @MinLength(1)
  signatureData: string;
}

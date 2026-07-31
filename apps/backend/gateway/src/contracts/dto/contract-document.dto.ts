import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Elaborated contract document (rich-text body + page layout) produced by the
 * contract editor. Persisted as a JSON file via FileStorageService — no Prisma
 * schema is involved. pageSetup is kept as a free-form object so the gateway
 * stays decoupled from the frontend's PageSetup shape.
 */
export class SaveContractDocumentDto {
  @ApiProperty({ description: 'HTML del cuerpo del documento (editor rich-text)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'HTML del encabezado' })
  @IsOptional()
  @IsString()
  header?: string;

  @ApiPropertyOptional({ description: 'HTML del pie de página' })
  @IsOptional()
  @IsString()
  footer?: string;

  @ApiPropertyOptional({ description: 'Diseño de página (size, margins, etc.)' })
  @IsOptional()
  @IsObject()
  pageSetup?: Record<string, unknown>;
}

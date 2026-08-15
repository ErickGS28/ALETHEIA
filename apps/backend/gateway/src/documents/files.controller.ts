import { basename, extname } from 'node:path';
import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { STORAGE_SERVICE, type StorageService } from './storage/storage.interface';

/**
 * Content types inert enough to render inline. Everything else is forced to
 * download so user-uploaded content (html/svg/etc.) can never execute on the
 * gateway origin (stored-XSS hardening).
 */
const INLINE_SAFE_TYPES = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

/** Minimal extension -> Content-Type map for serving stored documents. */
const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
};

@ApiTags('files')
@ApiBearerAuth('access-token')
@Controller('files')
export class FilesController {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  /**
   * Streams a stored document binary with the proper Content-Type.
   * Protected by the global JwtAuthGuard (same as the rest of the gateway).
   * Bypasses the global TransformInterceptor by writing to the raw response.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Descargar/servir un archivo almacenado' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const stream = await this.storage.getStream(id);
    if (!stream) throw new NotFoundException('Archivo no encontrado');

    const contentType = MIME_BY_EXT[extname(id).toLowerCase()] ?? 'application/octet-stream';
    const disposition = INLINE_SAFE_TYPES.has(contentType) ? 'inline' : 'attachment';
    const safeName = basename(id).replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);

    stream.pipe(res);
  }
}

import { BadRequestException } from '@nestjs/common';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);

/** Server-side upload validation — mirrors the frontend's validateDocumentFile. */
export function assertValidUpload(file: Express.Multer.File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException('El archivo supera el máximo de 10MB.');
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Formato no permitido. Usa PDF, PNG o JPG.');
  }
}

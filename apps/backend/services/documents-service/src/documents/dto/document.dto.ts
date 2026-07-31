/** Payload de creación de un documento (incluye su primera versión). */
export interface CreateDocumentDto {
  contractId: number;
  name: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  isRequired?: boolean;
  expiresAt?: string | Date | null;
}

/** Payload para registrar una nueva versión de un documento existente. */
export interface CreateVersionDto {
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

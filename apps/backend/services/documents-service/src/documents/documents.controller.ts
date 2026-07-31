import { DOCUMENTS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DocumentsService } from './documents.service';
import type { CreateDocumentDto, CreateVersionDto } from './dto/document.dto';
import type { ProviderType } from './factories/document-requirement.factory';

/**
 * Controlador de microservicio: responde a los mensajes Redis del gateway.
 * No expone HTTP — el borde REST vive en el gateway.
 */
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @MessagePattern(DOCUMENTS_PATTERNS.CREATE)
  create(@Payload() payload: { dto: CreateDocumentDto; uploadedById: number }) {
    return this.documentsService.create(payload.dto, payload.uploadedById);
  }

  @MessagePattern(DOCUMENTS_PATTERNS.FIND_BY_CONTRACT)
  findByContract(@Payload() payload: { contractId: number }) {
    return this.documentsService.findByContract(payload.contractId);
  }

  @MessagePattern(DOCUMENTS_PATTERNS.REQUIRED)
  required(@Payload() payload: { providerType: ProviderType }) {
    return this.documentsService.required(payload.providerType);
  }

  @MessagePattern(DOCUMENTS_PATTERNS.VERSION_FIND)
  versionFind(@Payload() payload: { documentId: number }) {
    return this.documentsService.versionsFind(payload.documentId);
  }

  @MessagePattern(DOCUMENTS_PATTERNS.VERSION_CREATE)
  versionCreate(
    @Payload() payload: { documentId: number; dto: CreateVersionDto; uploadedById: number },
  ) {
    return this.documentsService.versionCreate(
      payload.documentId,
      payload.dto,
      payload.uploadedById,
    );
  }
}

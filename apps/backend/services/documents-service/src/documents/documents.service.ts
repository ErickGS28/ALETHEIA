import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import type { CreateDocumentDto, CreateVersionDto } from './dto/document.dto';
import {
  DocumentRequirementFactory,
  type ProviderType,
} from './factories/document-requirement.factory';

@Injectable()
export class DocumentsService {
  constructor(private readonly repository: DocumentsRepository) {}

  /** Crea Document + 1ra DocumentVersion; devuelve el Document con versions. */
  create(dto: CreateDocumentDto, uploadedById: number) {
    return this.repository.createWithFirstVersion(dto, uploadedById);
  }

  /** Documentos de un contrato incluyendo versiones. */
  findByContract(contractId: number) {
    return this.repository.findByContract(contractId);
  }

  /** Documentos requeridos según el tipo de proveedor (Factory). */
  required(providerType: ProviderType) {
    return DocumentRequirementFactory.getRequired(providerType);
  }

  /** Versiones de un documento, ascendente. */
  versionsFind(documentId: number) {
    return this.repository.findVersions(documentId);
  }

  /** Nueva versión: NotFound si el documento no existe. */
  async versionCreate(documentId: number, dto: CreateVersionDto, uploadedById: number) {
    const document = await this.repository.findById(documentId);
    if (!document) throw new NotFoundException('Documento no encontrado');

    return this.repository.addVersion(documentId, dto, uploadedById);
  }
}

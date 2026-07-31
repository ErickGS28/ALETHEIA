import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDocumentDto, CreateVersionDto } from './dto/document.dto';

/**
 * Repository sobre PrismaService: aísla el acceso a datos de Document/DocumentVersion.
 * Crea y versiona en transacción para mantener consistente `currentVersion`.
 */
@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea el Document (currentVersion=1) junto con su primera DocumentVersion. */
  async createWithFirstVersion(dto: CreateDocumentDto, uploadedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          contractId: dto.contractId,
          name: dto.name,
          type: dto.type,
          isRequired: dto.isRequired ?? true,
          currentVersion: 1,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          fileUrl: dto.fileUrl,
          fileSize: dto.fileSize ?? null,
          mimeType: dto.mimeType ?? null,
          uploadedById,
        },
      });

      return tx.document.findUniqueOrThrow({
        where: { id: document.id },
        include: { versions: { orderBy: { version: 'asc' } } },
      });
    });
  }

  /** Documentos de un contrato, con sus versiones. */
  async findByContract(contractId: number) {
    return this.prisma.document.findMany({
      where: { contractId },
      include: { versions: { orderBy: { version: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Documento por id (sin versiones). */
  async findById(id: number) {
    return this.prisma.document.findUnique({ where: { id } });
  }

  /** Versiones de un documento, ascendente. */
  async findVersions(documentId: number) {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'asc' },
    });
  }

  /**
   * Incrementa `currentVersion` del Document y crea la DocumentVersion con ese
   * número en una transacción para evitar carreras sobre el contador.
   */
  async addVersion(documentId: number, dto: CreateVersionDto, uploadedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: documentId },
        data: { currentVersion: { increment: 1 } },
      });

      return tx.documentVersion.create({
        data: {
          documentId,
          version: updated.currentVersion,
          fileUrl: dto.fileUrl,
          fileSize: dto.fileSize ?? null,
          mimeType: dto.mimeType ?? null,
          uploadedById,
        },
      });
    });
  }
}

export type DocumentWithVersions = Prisma.DocumentGetPayload<{
  include: { versions: true };
}>;

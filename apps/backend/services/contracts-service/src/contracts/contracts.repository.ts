import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Repositorio de Contract: única puerta de acceso a Prisma para esta entidad (principio D de SOLID).
 * El service depende de esta abstracción, no del cliente Prisma directamente.
 */
@Injectable()
export class ContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ContractCreateInput) {
    return this.prisma.contract.create({ data });
  }

  findMany(where: Prisma.ContractWhereInput) {
    return this.prisma.contract.findMany({
      where,
      include: { area: true, society: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.contract.findUnique({
      where: { id },
      include: { area: true, society: true, template: true },
    });
  }

  update(id: number, data: Prisma.ContractUpdateInput) {
    return this.prisma.contract.update({ where: { id }, data });
  }

  updateStatus(id: number, data: Prisma.ContractUpdateInput) {
    return this.prisma.contract.update({ where: { id }, data });
  }

  /**
   * Crea el contrato y genera su folio único en una transacción:
   * primero inserta para obtener el id, luego actualiza el folio a partir de él.
   */
  createWithFolio(data: Prisma.ContractCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({ data });
      const year = created.createdAt.getFullYear();
      const folio = `CLM-${year}-${String(created.id).padStart(6, '0')}`;
      return tx.contract.update({
        where: { id: created.id },
        data: { folio },
      });
    });
  }
}

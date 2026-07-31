import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProviderType } from '../../generated/prisma';
import { ContractsRepository } from './contracts.repository';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';

/** Contexto de usuario relevante para el scoping de findAll. */
interface FindAllUser {
  userId: number;
  privileges: string[];
  areaId?: number | null;
}

interface ContractFilters {
  status?: string;
  areaId?: number;
  providerType?: string;
}

@Injectable()
export class ContractsService {
  constructor(private readonly repository: ContractsRepository) {}

  /**
   * Crea un contrato en estado DRAFT con folio autogenerado (CLM-<año>-<id 6 dígitos>).
   * El folio se asigna dentro de una transacción a partir del id recién creado.
   */
  async create(dto: CreateContractDto, createdById: number) {
    // folio temporal único hasta que la transacción lo reemplace por el definitivo.
    const tempFolio = `PENDING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const data: Prisma.ContractCreateInput = {
      folio: tempFolio,
      title: dto.title,
      vendorName: dto.vendorName,
      vendorEmail: dto.vendorEmail ?? null,
      providerType: dto.providerType,
      createdById,
      area: { connect: { id: dto.areaId } },
      society: { connect: { id: dto.societyId } },
      ...(dto.templateId ? { template: { connect: { id: dto.templateId } } } : {}),
    };

    return this.repository.createWithFolio(data);
  }

  /**
   * Lista contratos aplicando scoping por privilegios:
   *  - CONTRACT_VIEW_ALL  → todos
   *  - CONTRACT_VIEW_AREA → los de su área
   *  - en otro caso       → solo los propios (createdById === userId)
   * Más filtros opcionales (status, areaId, providerType).
   */
  findAll(user: FindAllUser, filters?: ContractFilters) {
    const where: Prisma.ContractWhereInput = {};

    if (user.privileges.includes('CONTRACT_VIEW_ALL')) {
      // sin restricción de propiedad
    } else if (user.privileges.includes('CONTRACT_VIEW_AREA')) {
      where.areaId = user.areaId ?? -1;
    } else {
      where.createdById = user.userId;
    }

    if (filters?.status) {
      where.status = filters.status as Prisma.ContractWhereInput['status'];
    }
    if (filters?.areaId !== undefined) {
      where.areaId = filters.areaId;
    }
    if (filters?.providerType) {
      where.providerType = filters.providerType as ProviderType;
    }

    return this.repository.findMany(where);
  }

  async findOne(id: number) {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException(`Contrato ${id} no encontrado`);
    return contract;
  }

  /** Actualiza un contrato solo si sigue en DRAFT; en otro caso lanza BadRequest. */
  async update(id: number, dto: UpdateContractDto, _userId: number) {
    const contract = await this.findOne(id);
    if (contract.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden editar contratos en estado DRAFT');
    }

    const data: Prisma.ContractUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.vendorName !== undefined) data.vendorName = dto.vendorName;
    if (dto.vendorEmail !== undefined) data.vendorEmail = dto.vendorEmail;
    if (dto.providerType !== undefined) data.providerType = dto.providerType;
    if (dto.areaId !== undefined) data.area = { connect: { id: dto.areaId } };
    if (dto.societyId !== undefined) data.society = { connect: { id: dto.societyId } };
    if (dto.templateId !== undefined) data.template = { connect: { id: dto.templateId } };

    return this.repository.update(id, data);
  }
}

import { Injectable } from '@nestjs/common';
import type { Contract, ContractStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findExpiring(start: Date, end: Date): Promise<Contract[]> {
    return this.prisma.contract.findMany({
      where: {
        expiresAt: { gte: start, lte: end },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  countByStatusInRange(status: ContractStatus, start: Date, end: Date): Promise<number> {
    return this.prisma.contract.count({
      where: {
        status,
        updatedAt: { gte: start, lte: end },
      },
    });
  }
}

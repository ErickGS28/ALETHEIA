import { Injectable } from '@nestjs/common';
import type { ContractStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StageWorkflowRow {
  stageId: number;
  stageName: string;
  slaHours: number;
  enteredAt: Date;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveContracts(excludedStatuses: ContractStatus[]): Promise<number> {
    return this.prisma.contract.count({
      where: { status: { notIn: excludedStatuses } },
    });
  }

  countByStatusUpdatedInRange(status: ContractStatus, start: Date, end: Date): Promise<number> {
    return this.prisma.contract.count({
      where: { status, updatedAt: { gte: start, lte: end } },
    });
  }

  async findActiveWorkflowsWithStage(): Promise<StageWorkflowRow[]> {
    const rows = await this.prisma.contractWorkflow.findMany({
      include: { stage: true },
    });

    return rows.map((row) => ({
      stageId: row.stage.id,
      stageName: row.stage.name,
      slaHours: row.stage.slaHours,
      enteredAt: row.enteredAt,
    }));
  }
}

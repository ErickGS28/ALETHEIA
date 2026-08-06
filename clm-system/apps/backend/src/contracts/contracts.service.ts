import { BadRequestException, Injectable } from '@nestjs/common';
import type { ContractStatus } from '@prisma/client';
import { endOfDayUTC, startOfDayUTC } from '../common/utils/date-range.util';
import { ContractsRepository } from './contracts.repository';

export interface ContractSummary {
  id: number;
  title: string;
  vendorName: string;
  status: string;
  expiresAt: string | null;
}

export interface ExpiringContractsResult {
  count: number;
  contratos: ContractSummary[];
  masUrgente: ContractSummary | null;
}

export interface ContractsMetricsResult {
  status: string;
  startDate: string;
  endDate: string;
  count: number;
}

@Injectable()
export class ContractsService {
  constructor(private readonly contractsRepository: ContractsRepository) {}

  private assertValidRange(startDate: string, endDate: string): void {
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new BadRequestException('startDate debe ser anterior o igual a endDate');
    }
  }

  async getExpiring(startDate: string, endDate: string): Promise<ExpiringContractsResult> {
    this.assertValidRange(startDate, endDate);

    const contracts = await this.contractsRepository.findExpiring(
      startOfDayUTC(startDate),
      endOfDayUTC(endDate),
    );

    const contratos: ContractSummary[] = contracts.map((c) => ({
      id: c.id,
      title: c.title,
      vendorName: c.vendorName,
      status: c.status,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : null,
    }));

    return {
      count: contratos.length,
      contratos,
      masUrgente: contratos[0] ?? null,
    };
  }

  async getMetrics(
    status: ContractStatus,
    startDate: string,
    endDate: string,
  ): Promise<ContractsMetricsResult> {
    this.assertValidRange(startDate, endDate);

    const count = await this.contractsRepository.countByStatusInRange(
      status,
      startOfDayUTC(startDate),
      endOfDayUTC(endDate),
    );

    return { status, startDate, endDate, count };
  }
}

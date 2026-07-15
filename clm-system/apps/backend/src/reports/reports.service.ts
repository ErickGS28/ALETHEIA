import { Injectable } from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import { endOfDayUTC, startOfDayUTC, todayISODate } from '../common/utils/date-range.util';
import { ReportsRepository } from './reports.repository';

const CLOSED_STATUSES: ContractStatus[] = [
  ContractStatus.SIGNED,
  ContractStatus.REJECTED,
  ContractStatus.CANCELLED,
];

export interface DailySummaryResult {
  pendientes: number;
  firmados: number;
  rechazados: number;
  fecha: string;
}

export interface StageBottleneck {
  stageId: number;
  stageName: string;
  cantidadVencidos: number;
}

export interface BottlenecksResult {
  etapas: StageBottleneck[];
  peor: StageBottleneck | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getDailySummary(): Promise<DailySummaryResult> {
    const fecha = todayISODate();
    const start = startOfDayUTC(fecha);
    const end = endOfDayUTC(fecha);

    const [pendientes, firmados, rechazados] = await Promise.all([
      this.reportsRepository.countActiveContracts(CLOSED_STATUSES),
      this.reportsRepository.countByStatusUpdatedInRange(ContractStatus.SIGNED, start, end),
      this.reportsRepository.countByStatusUpdatedInRange(ContractStatus.REJECTED, start, end),
    ]);

    return { pendientes, firmados, rechazados, fecha };
  }

  async getBottlenecks(): Promise<BottlenecksResult> {
    const rows = await this.reportsRepository.findActiveWorkflowsWithStage();
    const now = Date.now();

    const overdueCountByStage = new Map<number, StageBottleneck>();

    for (const row of rows) {
      const hoursElapsed = (now - row.enteredAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed < row.slaHours) continue;

      const existing = overdueCountByStage.get(row.stageId);
      if (existing) {
        existing.cantidadVencidos += 1;
      } else {
        overdueCountByStage.set(row.stageId, {
          stageId: row.stageId,
          stageName: row.stageName,
          cantidadVencidos: 1,
        });
      }
    }

    const etapas = Array.from(overdueCountByStage.values()).sort(
      (a, b) => b.cantidadVencidos - a.cantidadVencidos,
    );

    return { etapas, peor: etapas[0] ?? null };
  }
}

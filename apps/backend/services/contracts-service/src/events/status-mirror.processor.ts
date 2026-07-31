import { JOBS, QUEUES, type StatusChangedJob } from '@aletheia/backend-commons';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Prisma } from '../../generated/prisma';
import { ContractsRepository } from '../contracts/contracts.repository';

/**
 * Consumidor de la cola CONTRACTS_INBOUND.
 * Refleja en Contract.status el estado autoritativo emitido por workflow-service.
 * Idempotente: si el contrato no existe, loggea y retorna sin fallar.
 */
@Processor(QUEUES.CONTRACTS_INBOUND)
export class StatusMirrorProcessor extends WorkerHost {
  private readonly logger = new Logger(StatusMirrorProcessor.name);

  constructor(private readonly repository: ContractsRepository) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOBS.STATUS_CHANGED) {
      this.logger.warn(`Job desconocido ignorado: ${job.name}`);
      return;
    }

    const data = job.data as StatusChangedJob;
    const existing = await this.repository.findById(data.contractId);
    if (!existing) {
      this.logger.warn(
        `Contrato ${data.contractId} no existe — STATUS_CHANGED ignorado (idempotente)`,
      );
      return;
    }

    const update: Prisma.ContractUpdateInput = {
      status: data.status as Prisma.ContractUpdateInput['status'],
    };

    if (data.status === 'SUBMITTED') {
      update.submittedAt = new Date();
    }
    if (data.status === 'CANCELLED') {
      update.cancelledAt = data.cancelledAt ? new Date(data.cancelledAt) : new Date();
      update.cancelReason = data.cancelReason ?? null;
    }

    await this.repository.updateStatus(data.contractId, update);
    this.logger.log(`Contrato ${data.contractId} → ${data.status}`);
  }
}

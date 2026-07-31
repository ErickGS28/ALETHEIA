import { JOBS, type NotifyJob, QUEUES } from '@aletheia/backend-commons';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import type { Role } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { NON_ACTIVE_STATES } from '../workflow/state-machine/contract-state-machine';

/**
 * Consumidor de SLA_SCAN (job repetible).
 * En OnModuleInit registra el tick repetible (cada 60s). En cada JOBS.SLA_TICK
 * escanea los ContractWorkflow en estados con etapa activa cuyo SLA venció y
 * encola NOTIFY al rol responsable de la etapa.
 */
@Injectable()
@Processor(QUEUES.SLA_SCAN)
export class SlaScanProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.SLA_SCAN) private readonly slaQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    await this.slaQueue.add(JOBS.SLA_TICK, {}, { repeat: { every: 60_000 }, jobId: 'sla-scan' });
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOBS.SLA_TICK) {
      return;
    }

    const nonActive = Array.from(NON_ACTIVE_STATES);
    const workflows = await this.prisma.contractWorkflow.findMany({
      where: { status: { notIn: nonActive } },
      include: { stage: true },
    });

    const now = Date.now();
    for (const wf of workflows) {
      const overdue = now - wf.enteredAt.getTime() >= wf.stage.slaHours * 3_600_000;
      if (!overdue) {
        continue;
      }

      const notifyJob: NotifyJob = {
        role: wf.stage.roleRequired as Role as NotifyJob['role'],
        contractId: wf.contractId,
        message: `SLA vencido: contrato ${wf.contractId} requiere atención`,
      };
      await this.notificationsQueue.add(JOBS.NOTIFY, notifyJob);
    }
  }
}

import { type ContractSignedJob, JOBS, QUEUES, type UserContext } from '@aletheia/backend-commons';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { WorkflowService } from '../workflow/workflow.service';

/**
 * Consumidor de WORKFLOW_INBOUND.
 * documents-service avisa (JOBS.CONTRACT_SIGNED) que se firmó un contrato;
 * aquí se ejecuta internamente la transición SIGN con un usuario sintético
 * que porta el privilegio CONTRACT_SIGN.
 */
@Processor(QUEUES.WORKFLOW_INBOUND)
export class WorkflowInboundProcessor extends WorkerHost {
  constructor(private readonly workflowService: WorkflowService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOBS.CONTRACT_SIGNED) {
      return;
    }

    const data = job.data as ContractSignedJob;
    const syntheticUser: UserContext = {
      userId: data.signedById,
      email: 'system@aletheia',
      roles: ['FIRMANTE'],
      privileges: ['CONTRACT_SIGN'],
      areaId: null,
    };

    // createdById se conserva del workflow (no se pasa aquí).
    await this.workflowService.transition({
      contractId: data.contractId,
      action: 'SIGN',
      user: syntheticUser,
    });
  }
}

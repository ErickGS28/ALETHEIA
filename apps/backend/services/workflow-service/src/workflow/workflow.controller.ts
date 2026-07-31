import { type UserContext, WORKFLOW_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { WorkflowActionName } from './state-machine/contract-state-machine';
import { WorkflowService } from './workflow.service';

/**
 * Controlador de microservicio: responde a los mensajes Redis del gateway.
 * No expone HTTP.
 */
@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @MessagePattern(WORKFLOW_PATTERNS.GET)
  get(@Payload() data: { contractId: number }) {
    return this.workflowService.get(data.contractId);
  }

  @MessagePattern(WORKFLOW_PATTERNS.TRANSITION)
  transition(
    @Payload()
    data: {
      contractId: number;
      action: WorkflowActionName;
      comment?: string;
      user: UserContext;
      createdById?: number;
    },
  ) {
    return this.workflowService.transition(data);
  }

  @MessagePattern(WORKFLOW_PATTERNS.AUDIT)
  audit(@Payload() data: { contractId: number }) {
    return this.workflowService.audit(data.contractId);
  }

  @MessagePattern(WORKFLOW_PATTERNS.STAGE_FIND_ALL)
  stageFindAll() {
    return this.workflowService.stageFindAll();
  }

  @MessagePattern(WORKFLOW_PATTERNS.STAGE_CREATE)
  stageCreate(
    @Payload()
    data: { dto: { name: string; order: number; slaHours: number; roleRequired: string } },
  ) {
    return this.workflowService.stageCreate(data.dto);
  }

  @MessagePattern(WORKFLOW_PATTERNS.STAGE_UPDATE)
  stageUpdate(
    @Payload()
    data: {
      id: number;
      dto: Partial<{ name: string; order: number; slaHours: number; roleRequired: string }>;
    },
  ) {
    return this.workflowService.stageUpdate(data.id, data.dto);
  }
}

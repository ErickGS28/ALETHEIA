import {
  JOBS,
  type NotifyJob,
  QUEUES,
  type StatusChangedJob,
  type UserContext,
} from '@aletheia/backend-commons';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Role, TransitionAction } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import {
  type ContractStatus,
  type WorkflowActionName,
  hasActiveStage,
  resolveTransition,
  stageOrderForStatus,
} from './state-machine/contract-state-machine';

export interface TransitionInput {
  contractId: number;
  action: WorkflowActionName;
  comment?: string;
  user: UserContext;
  createdById?: number;
}

type SlaColor = 'GREEN' | 'YELLOW' | 'RED';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.CONTRACTS_INBOUND) private readonly contractsQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Comando único del State Machine. Resuelve la regla, valida privilegios,
   * persiste la transición en transacción y dispara los efectos asíncronos:
   * Observer (NOTIFICATIONS) y espejo de estado (CONTRACTS_INBOUND).
   */
  async transition(input: TransitionInput) {
    const { contractId, action, comment, user, createdById } = input;

    // 1. Carga el workflow actual (o asume DRAFT si aún no existe y la acción es SUBMIT).
    const workflow = await this.prisma.contractWorkflow.findUnique({
      where: { contractId },
    });

    let currentStatus: ContractStatus;
    if (workflow) {
      currentStatus = workflow.status as ContractStatus;
    } else if (action === 'SUBMIT') {
      currentStatus = 'DRAFT';
    } else {
      throw new BadRequestException(
        `No existe workflow para el contrato ${contractId} y la acción ${action} requiere uno`,
      );
    }

    // 2. Resuelve la regla y valida privilegios.
    const rule = resolveTransition(currentStatus, action);
    if (!rule) {
      throw new BadRequestException(`Transición ilegal: ${currentStatus} + ${action}`);
    }
    if (!user.privileges.includes(rule.privilege)) {
      throw new ForbiddenException(
        `El usuario carece del privilegio ${rule.privilege} para ejecutar ${action} en ${currentStatus}`,
      );
    }

    const nextStatus = rule.next;
    const stage = await this.resolveStage(nextStatus);
    const enteredAt = new Date();

    // 3. Persistencia transaccional: upsert workflow + transición + auditoría.
    const persistedWorkflow = await this.prisma.$transaction(async (tx) => {
      const wf = await tx.contractWorkflow.upsert({
        where: { contractId },
        create: {
          contractId,
          stageId: stage.id,
          status: nextStatus,
          enteredAt,
          comment: comment ?? null,
          createdById: createdById ?? null,
        },
        update: {
          stageId: stage.id,
          status: nextStatus,
          enteredAt,
          comment: comment ?? null,
          ...(createdById != null ? { createdById } : {}),
        },
      });

      await tx.workflowTransition.create({
        data: {
          contractWorkflowId: wf.id,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          action: action as TransitionAction,
          comment: comment ?? null,
          performedBy: user.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          contractId,
          userId: user.userId,
          action: String(action),
          detail: comment ?? null,
        },
      });

      return wf;
    });

    // 4. Observer: encola la notificación (por rol o al creador).
    await this.enqueueNotification(rule, contractId, persistedWorkflow.createdById, nextStatus);

    // 5. Espejo: encola el cambio de estado hacia contracts-service.
    await this.enqueueStatusMirror(contractId, nextStatus, action, comment);

    return {
      contractId,
      status: nextStatus,
      stageId: stage.id,
      stageName: stage.name,
      enteredAt,
    };
  }

  /** Estado + etapa + SLA + historial de transiciones de un contrato. */
  async get(contractId: number) {
    const workflow = await this.prisma.contractWorkflow.findUnique({
      where: { contractId },
      include: {
        stage: true,
        transitions: { orderBy: { performedAt: 'asc' } },
      },
    });

    if (!workflow) {
      return {
        contractId,
        status: 'DRAFT',
        stage: null,
        enteredAt: null,
        sla: null,
        transitions: [],
      };
    }

    const status = workflow.status as ContractStatus;
    const stage = {
      id: workflow.stage.id,
      name: workflow.stage.name,
      order: workflow.stage.order,
      roleRequired: workflow.stage.roleRequired,
      slaHours: workflow.stage.slaHours,
    };

    const sla = hasActiveStage(status)
      ? this.computeSla(workflow.enteredAt, workflow.stage.slaHours)
      : null;

    return {
      contractId,
      status,
      stage,
      enteredAt: workflow.enteredAt,
      sla,
      transitions: workflow.transitions,
    };
  }

  /** Bitácora del contrato, más reciente primero. */
  async audit(contractId: number) {
    return this.prisma.auditLog.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Stages CRUD ---

  stageFindAll() {
    return this.prisma.workflowStage.findMany({ orderBy: { order: 'asc' } });
  }

  stageCreate(dto: { name: string; order: number; slaHours: number; roleRequired: string }) {
    return this.prisma.workflowStage.create({
      data: {
        name: dto.name,
        order: dto.order,
        slaHours: dto.slaHours,
        roleRequired: dto.roleRequired as Role,
      },
    });
  }

  stageUpdate(
    id: number,
    dto: Partial<{ name: string; order: number; slaHours: number; roleRequired: string }>,
  ) {
    return this.prisma.workflowStage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.slaHours !== undefined ? { slaHours: dto.slaHours } : {}),
        ...(dto.roleRequired !== undefined ? { roleRequired: dto.roleRequired as Role } : {}),
      },
    });
  }

  // --- Helpers internos ---

  /** Resuelve la etapa (WorkflowStage) correspondiente al estado destino por su orden. */
  private async resolveStage(status: ContractStatus) {
    const order = stageOrderForStatus(status);
    const stage = await this.prisma.workflowStage.findFirst({ where: { order } });
    if (!stage) {
      throw new NotFoundException(`No existe la etapa con orden ${order}. ¿Ejecutaste el seed?`);
    }
    return stage;
  }

  private computeSla(enteredAt: Date, slaHours: number): { hoursElapsed: number; color: SlaColor } {
    const hoursElapsed = (Date.now() - enteredAt.getTime()) / 3_600_000;
    let color: SlaColor;
    if (hoursElapsed < slaHours * 0.6) {
      color = 'GREEN';
    } else if (hoursElapsed < slaHours) {
      color = 'YELLOW';
    } else {
      color = 'RED';
    }
    return { hoursElapsed, color };
  }

  private async enqueueNotification(
    rule: { notifyRole?: string; notifyCreator?: boolean },
    contractId: number,
    createdById: number | null,
    nextStatus: ContractStatus,
  ) {
    const message = `Contrato ${contractId} ahora en estado ${nextStatus}`;
    let job: NotifyJob;

    if (rule.notifyCreator) {
      if (createdById == null) {
        // Sin creador conocido no hay a quién notificar; se omite.
        return;
      }
      job = { userId: createdById, contractId, message };
    } else if (rule.notifyRole) {
      job = { role: rule.notifyRole as NotifyJob['role'], contractId, message };
    } else {
      return;
    }

    await this.notificationsQueue.add(JOBS.NOTIFY, job);
  }

  private async enqueueStatusMirror(
    contractId: number,
    nextStatus: ContractStatus,
    action: WorkflowActionName,
    comment?: string,
  ) {
    const job: StatusChangedJob = {
      contractId,
      status: nextStatus,
    };
    if (action === 'CANCEL') {
      job.cancelReason = comment ?? null;
      job.cancelledAt = new Date().toISOString();
    }
    await this.contractsQueue.add(JOBS.STATUS_CHANGED, job);
  }
}

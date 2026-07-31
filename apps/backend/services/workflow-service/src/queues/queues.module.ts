import { QUEUES } from '@aletheia/backend-commons';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { NotificationsProcessor } from './notifications.processor';
import { SlaScanProcessor } from './sla-scan.processor';
import { WorkflowInboundProcessor } from './workflow-inbound.processor';

/**
 * Registra los processors BullMQ que CONSUME el workflow-service:
 *  - WORKFLOW_INBOUND (firma -> transición SIGN)
 *  - NOTIFICATIONS    (Observer: persiste notificaciones)
 *  - SLA_SCAN         (tick repetible: escala SLA vencidos)
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.WORKFLOW_INBOUND },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.SLA_SCAN },
    ),
    WorkflowModule,
    NotificationsModule,
  ],
  providers: [WorkflowInboundProcessor, NotificationsProcessor, SlaScanProcessor],
})
export class QueuesModule {}

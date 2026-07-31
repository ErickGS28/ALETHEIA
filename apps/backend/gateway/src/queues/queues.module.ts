import { QUEUES, bullConnection } from '@aletheia/backend-commons';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

const QUEUE_NAMES = [
  QUEUES.WORKFLOW_INBOUND,
  QUEUES.CONTRACTS_INBOUND,
  QUEUES.NOTIFICATIONS,
  QUEUES.SLA_SCAN,
] as const;

/**
 * Dashboard Bull Board montado en /admin/queues (solo lectura/visualización).
 * El gateway NO procesa colas: solo referencia las 4 colas BullMQ para inspeccionarlas.
 * Accesible sin token (panel de demo) — no pasa por el guard global.
 */
@Module({
  imports: [
    BullModule.forRoot({ connection: bullConnection() }),
    BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name }))),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    ...QUEUE_NAMES.map((name) => BullBoardModule.forFeature({ name, adapter: BullMQAdapter })),
  ],
})
export class QueuesModule {}

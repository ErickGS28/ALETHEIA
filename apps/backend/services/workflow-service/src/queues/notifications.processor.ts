import { JOBS, type NotifyJob, QUEUES } from '@aletheia/backend-commons';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Consumidor de NOTIFICATIONS (Observer).
 * Persiste la fila Notification a partir del NotifyJob. Reintetable.
 */
@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOBS.NOTIFY) {
      return;
    }
    await this.notificationsService.create(job.data as NotifyJob);
  }
}

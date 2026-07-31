import type { NotifyJob } from '@aletheia/backend-commons';
import { Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, Role } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persiste una notificación a partir de un NotifyJob (Observer). */
  create(job: NotifyJob) {
    return this.prisma.notification.create({
      data: {
        userId: job.userId ?? null,
        role: (job.role ?? null) as Role | null,
        contractId: job.contractId ?? null,
        message: job.message,
      },
    });
  }

  /**
   * Notificaciones del usuario: dirigidas a su userId O a alguno de sus roles.
   * Orden createdAt descendente.
   */
  findForUser(userId: number, roles: string[]) {
    const roleEnums = roles.filter((r): r is keyof typeof Role => r in Role).map((r) => Role[r]);

    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId }, ...(roleEnums.length > 0 ? [{ role: { in: roleEnums } }] : [])],
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}

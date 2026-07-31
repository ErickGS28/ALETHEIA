import { NOTIFICATIONS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @MessagePattern(NOTIFICATIONS_PATTERNS.FIND_ALL)
  findAll(@Payload() data: { user: { userId: number; roles: string[] } }) {
    return this.notificationsService.findForUser(data.user.userId, data.user.roles);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.MARK_READ)
  markRead(@Payload() data: { id: number; userId: number }) {
    return this.notificationsService.markRead(data.id, data.userId);
  }
}

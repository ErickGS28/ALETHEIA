import {
  CurrentUser,
  NOTIFICATIONS_PATTERNS,
  SERVICE_CLIENTS,
  type UserContext,
} from '@aletheia/backend-commons';
import { Controller, Get, Inject, Param, ParseIntPipe, Patch } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Mis notificaciones (por usuario o por rol), más recientes primero' })
  findAll(@CurrentUser() user: UserContext) {
    return firstValueFrom(
      this.workflow.send(NOTIFICATIONS_PATTERNS.FIND_ALL, {
        user: { userId: user.userId, roles: user.roles },
      }),
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserContext) {
    return firstValueFrom(
      this.workflow.send(NOTIFICATIONS_PATTERNS.MARK_READ, { id, userId: user.userId }),
    );
  }
}

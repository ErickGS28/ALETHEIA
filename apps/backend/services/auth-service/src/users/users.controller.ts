import { USERS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';

/**
 * Controlador de microservicio: responde a mensajes Redis enviados por el gateway.
 * No expone HTTP — el borde REST vive en el gateway.
 */
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern(USERS_PATTERNS.CREATE)
  create(
    @Payload()
    data: {
      dto: {
        email: string;
        name: string;
        lastName: string;
        password: string;
        roles: string[];
        areaId?: number | null;
      };
    },
  ) {
    return this.usersService.create(data.dto);
  }

  @MessagePattern(USERS_PATTERNS.FIND_ALL)
  findAll(@Payload() _data: Record<string, never>) {
    return this.usersService.findAll();
  }

  @MessagePattern(USERS_PATTERNS.FIND_ONE)
  findOne(@Payload() data: { id: number }) {
    return this.usersService.findOne(data.id);
  }

  @MessagePattern(USERS_PATTERNS.UPDATE)
  update(
    @Payload()
    data: {
      id: number;
      dto: Partial<{
        name: string;
        lastName: string;
        password: string;
        roles: string[];
        areaId: number | null;
        isActive: boolean;
      }>;
    },
  ) {
    return this.usersService.update(data.id, data.dto);
  }

  @MessagePattern(USERS_PATTERNS.REMOVE)
  remove(@Payload() data: { id: number }) {
    return this.usersService.remove(data.id);
  }
}

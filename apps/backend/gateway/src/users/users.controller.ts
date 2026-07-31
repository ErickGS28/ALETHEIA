import { RequirePrivilege, SERVICE_CLIENTS, USERS_PATTERNS } from '@aletheia/backend-commons';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@RequirePrivilege('USERS_MANAGE')
@Controller('users')
export class UsersController {
  constructor(@Inject(SERVICE_CLIENTS.AUTH) private readonly auth: ClientProxy) {}

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto) {
    return firstValueFrom(this.auth.send(USERS_PATTERNS.CREATE, { dto }));
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return firstValueFrom(this.auth.send(USERS_PATTERNS.FIND_ALL, {}));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.auth.send(USERS_PATTERNS.FIND_ONE, { id }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return firstValueFrom(this.auth.send(USERS_PATTERNS.UPDATE, { id, dto }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.auth.send(USERS_PATTERNS.REMOVE, { id }));
  }
}

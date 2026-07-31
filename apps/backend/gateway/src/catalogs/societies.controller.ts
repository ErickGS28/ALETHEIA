import { CATALOGS_PATTERNS, RequirePrivilege, SERVICE_CLIENTS } from '@aletheia/backend-commons';
import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateNamedDto, UpdateNamedDto } from './dto/catalog.dto';

@ApiTags('catalogs · societies')
@ApiBearerAuth('access-token')
@Controller('societies')
export class SocietiesController {
  constructor(@Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar sociedades' })
  findAll() {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.SOCIETY_FIND_ALL, {}));
  }

  @Post()
  @RequirePrivilege('AREAS_MANAGE')
  @ApiOperation({ summary: 'Crear sociedad' })
  create(@Body() dto: CreateNamedDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.SOCIETY_CREATE, { dto }));
  }

  @Patch(':id')
  @RequirePrivilege('AREAS_MANAGE')
  @ApiOperation({ summary: 'Actualizar sociedad' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNamedDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.SOCIETY_UPDATE, { id, dto }));
  }
}

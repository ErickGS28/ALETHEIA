import { CATALOGS_PATTERNS, RequirePrivilege, SERVICE_CLIENTS } from '@aletheia/backend-commons';
import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateApoderadoDto, UpdateApoderadoDto } from './dto/catalog.dto';

@ApiTags('catalogs · apoderados')
@ApiBearerAuth('access-token')
@Controller('apoderados')
export class ApoderadosController {
  constructor(@Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar apoderados' })
  findAll() {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.APODERADO_FIND_ALL, {}));
  }

  @Post()
  @RequirePrivilege('APODERADOS_MANAGE')
  @ApiOperation({ summary: 'Crear apoderado' })
  create(@Body() dto: CreateApoderadoDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.APODERADO_CREATE, { dto }));
  }

  @Patch(':id')
  @RequirePrivilege('APODERADOS_MANAGE')
  @ApiOperation({ summary: 'Actualizar apoderado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApoderadoDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.APODERADO_UPDATE, { id, dto }));
  }
}

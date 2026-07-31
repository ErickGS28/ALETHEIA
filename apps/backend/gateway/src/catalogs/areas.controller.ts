import { CATALOGS_PATTERNS, RequirePrivilege, SERVICE_CLIENTS } from '@aletheia/backend-commons';
import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateNamedDto, UpdateNamedDto } from './dto/catalog.dto';

@ApiTags('catalogs · areas')
@ApiBearerAuth('access-token')
@Controller('areas')
export class AreasController {
  constructor(@Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar áreas' })
  findAll() {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.AREA_FIND_ALL, {}));
  }

  @Post()
  @RequirePrivilege('AREAS_MANAGE')
  @ApiOperation({ summary: 'Crear área' })
  create(@Body() dto: CreateNamedDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.AREA_CREATE, { dto }));
  }

  @Patch(':id')
  @RequirePrivilege('AREAS_MANAGE')
  @ApiOperation({ summary: 'Actualizar área' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNamedDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.AREA_UPDATE, { id, dto }));
  }
}

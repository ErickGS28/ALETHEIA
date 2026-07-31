import { CATALOGS_PATTERNS, RequirePrivilege, SERVICE_CLIENTS } from '@aletheia/backend-commons';
import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/catalog.dto';

@ApiTags('catalogs · templates')
@ApiBearerAuth('access-token')
@Controller('templates')
export class TemplatesController {
  constructor(@Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar plantillas' })
  findAll() {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.TEMPLATE_FIND_ALL, {}));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una plantilla por id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.TEMPLATE_FIND_ONE, { id }));
  }

  @Post()
  @RequirePrivilege('TEMPLATES_MANAGE')
  @ApiOperation({ summary: 'Crear plantilla' })
  create(@Body() dto: CreateTemplateDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.TEMPLATE_CREATE, { dto }));
  }

  @Patch(':id')
  @RequirePrivilege('TEMPLATES_MANAGE')
  @ApiOperation({ summary: 'Actualizar plantilla' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return firstValueFrom(this.contracts.send(CATALOGS_PATTERNS.TEMPLATE_UPDATE, { id, dto }));
  }
}

import { CATALOGS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CatalogsService } from './catalogs.service';

/**
 * Controlador de microservicio para catálogos: responde a mensajes Redis del gateway.
 */
@Controller()
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  // ---- Society ----
  @MessagePattern(CATALOGS_PATTERNS.SOCIETY_FIND_ALL)
  societyFindAll() {
    return this.catalogsService.societyFindAll();
  }

  @MessagePattern(CATALOGS_PATTERNS.SOCIETY_CREATE)
  societyCreate(@Payload() payload: { dto: { name: string } }) {
    return this.catalogsService.societyCreate(payload.dto);
  }

  @MessagePattern(CATALOGS_PATTERNS.SOCIETY_UPDATE)
  societyUpdate(@Payload() payload: { id: number; dto: { name?: string; isActive?: boolean } }) {
    return this.catalogsService.societyUpdate(payload.id, payload.dto);
  }

  // ---- Area ----
  @MessagePattern(CATALOGS_PATTERNS.AREA_FIND_ALL)
  areaFindAll() {
    return this.catalogsService.areaFindAll();
  }

  @MessagePattern(CATALOGS_PATTERNS.AREA_CREATE)
  areaCreate(@Payload() payload: { dto: { name: string } }) {
    return this.catalogsService.areaCreate(payload.dto);
  }

  @MessagePattern(CATALOGS_PATTERNS.AREA_UPDATE)
  areaUpdate(@Payload() payload: { id: number; dto: { name?: string; isActive?: boolean } }) {
    return this.catalogsService.areaUpdate(payload.id, payload.dto);
  }

  // ---- Apoderado ----
  @MessagePattern(CATALOGS_PATTERNS.APODERADO_FIND_ALL)
  apoderadoFindAll() {
    return this.catalogsService.apoderadoFindAll();
  }

  @MessagePattern(CATALOGS_PATTERNS.APODERADO_CREATE)
  apoderadoCreate(@Payload() payload: { dto: { name: string; legalPower: string } }) {
    return this.catalogsService.apoderadoCreate(payload.dto);
  }

  @MessagePattern(CATALOGS_PATTERNS.APODERADO_UPDATE)
  apoderadoUpdate(
    @Payload()
    payload: { id: number; dto: { name?: string; legalPower?: string; isActive?: boolean } },
  ) {
    return this.catalogsService.apoderadoUpdate(payload.id, payload.dto);
  }

  // ---- Template ----
  @MessagePattern(CATALOGS_PATTERNS.TEMPLATE_FIND_ALL)
  templateFindAll() {
    return this.catalogsService.templateFindAll();
  }

  @MessagePattern(CATALOGS_PATTERNS.TEMPLATE_FIND_ONE)
  templateFindOne(@Payload() payload: { id: number }) {
    return this.catalogsService.templateFindOne(payload.id);
  }

  @MessagePattern(CATALOGS_PATTERNS.TEMPLATE_CREATE)
  templateCreate(@Payload() payload: { dto: { name: string; content: string } }) {
    return this.catalogsService.templateCreate(payload.dto);
  }

  @MessagePattern(CATALOGS_PATTERNS.TEMPLATE_UPDATE)
  templateUpdate(
    @Payload() payload: {
      id: number;
      dto: { name?: string; content?: string; isActive?: boolean };
    },
  ) {
    return this.catalogsService.templateUpdate(payload.id, payload.dto);
  }
}

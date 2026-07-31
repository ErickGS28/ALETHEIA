import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CRUD de catálogos del dominio contracts: sociedades, áreas, apoderados y plantillas.
 * findAll devuelve solo registros activos.
 */
@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Society ----
  societyFindAll() {
    return this.prisma.society.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  societyCreate(dto: { name: string }) {
    return this.prisma.society.create({ data: { name: dto.name } });
  }

  societyUpdate(id: number, dto: { name?: string; isActive?: boolean }) {
    return this.prisma.society.update({ where: { id }, data: dto });
  }

  // ---- Area ----
  areaFindAll() {
    return this.prisma.area.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  areaCreate(dto: { name: string }) {
    return this.prisma.area.create({ data: { name: dto.name } });
  }

  areaUpdate(id: number, dto: { name?: string; isActive?: boolean }) {
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  // ---- Apoderado ----
  apoderadoFindAll() {
    return this.prisma.apoderado.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  apoderadoCreate(dto: { name: string; legalPower: string }) {
    return this.prisma.apoderado.create({ data: { name: dto.name, legalPower: dto.legalPower } });
  }

  apoderadoUpdate(id: number, dto: { name?: string; legalPower?: string; isActive?: boolean }) {
    return this.prisma.apoderado.update({ where: { id }, data: dto });
  }

  // ---- Template ----
  templateFindAll() {
    return this.prisma.template.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async templateFindOne(id: number) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException(`Plantilla ${id} no encontrada`);
    return template;
  }

  templateCreate(dto: { name: string; content: string }) {
    return this.prisma.template.create({ data: { name: dto.name, content: dto.content } });
  }

  templateUpdate(id: number, dto: { name?: string; content?: string; isActive?: boolean }) {
    return this.prisma.template.update({ where: { id }, data: dto });
  }
}

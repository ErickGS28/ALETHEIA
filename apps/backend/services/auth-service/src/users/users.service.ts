import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { type Prisma, Role } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

// Matriz oficial de privilegios por rol.
const ROLE_PRIVILEGES: Record<Role, string[]> = {
  [Role.SOLICITANTE]: [
    'CONTRACT_CREATE',
    'CONTRACT_EDIT',
    'CONTRACT_SUBMIT',
    'CONTRACT_CANCEL',
    'CONTRACT_RECOVER',
    'CONTRACT_VIEW_AREA',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_VERSION',
  ],
  [Role.ADMINISTRADOR]: [
    'CONTRACT_CANCEL',
    'CONTRACT_RECOVER',
    'CONTRACT_REVIEW_ADMIN',
    'CONTRACT_VIEW_ALL',
    'DOCUMENT_VERSION',
    'WORKFLOW_CONFIG',
    'USERS_MANAGE',
    'AREAS_MANAGE',
    'APODERADOS_MANAGE',
    'TEMPLATES_MANAGE',
    'REPORTS_VIEW',
  ],
  [Role.ABOGADO]: [
    'CONTRACT_REVIEW_LAWYER',
    'CONTRACT_VIEW_AREA',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_VERSION',
    'TEMPLATES_MANAGE',
    'REPORTS_VIEW',
  ],
  [Role.APROBADOR]: ['CONTRACT_APPROVE', 'CONTRACT_VIEW_AREA', 'REPORTS_VIEW'],
  [Role.FIRMANTE]: ['CONTRACT_SIGN', 'CONTRACT_VIEW_AREA'],
};

// Campos públicos: todo menos password.
const userSelect = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  roles: true,
  privileges: true,
  isActive: true,
  areaId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

interface CreateUserDto {
  email: string;
  name: string;
  lastName: string;
  password: string;
  roles: string[];
  areaId?: number | null;
}

interface UpdateUserDto {
  name?: string;
  lastName?: string;
  password?: string;
  roles?: string[];
  areaId?: number | null;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Deriva la unión (sin duplicados) de privilegios a partir de los roles.
  private privilegesForRoles(roles: Role[]): string[] {
    const set = new Set<string>();
    for (const role of roles) {
      for (const privilege of ROLE_PRIVILEGES[role] ?? []) {
        set.add(privilege);
      }
    }
    return [...set];
  }

  async create(dto: CreateUserDto) {
    const roles = dto.roles as Role[];
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        lastName: dto.lastName,
        password: hashedPassword,
        roles,
        privileges: this.privilegesForRoles(roles),
        areaId: dto.areaId ?? null,
      },
      select: userSelect,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({ select: userSelect });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.areaId !== undefined) data.areaId = dto.areaId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.roles !== undefined) {
      const roles = dto.roles as Role[];
      data.roles = roles;
      data.privileges = this.privilegesForRoles(roles);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    // Borra refresh tokens antes para no violar la FK.
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });

    return { id };
  }
}

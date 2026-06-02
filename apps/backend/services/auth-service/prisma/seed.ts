import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../generated/prisma';

const prisma = new PrismaClient();

// Catálogo completo de privilegios (19) — ver docs/01-architecture/implementacion.md §7.
const ALL_PRIVILEGES = [
  'CONTRACT_CREATE',
  'CONTRACT_EDIT',
  'CONTRACT_SUBMIT',
  'CONTRACT_CANCEL',
  'CONTRACT_RECOVER',
  'CONTRACT_REVIEW_ADMIN',
  'CONTRACT_REVIEW_LAWYER',
  'CONTRACT_APPROVE',
  'CONTRACT_SIGN',
  'CONTRACT_VIEW_ALL',
  'CONTRACT_VIEW_AREA',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_VERSION',
  'WORKFLOW_CONFIG',
  'USERS_MANAGE',
  'AREAS_MANAGE',
  'APODERADOS_MANAGE',
  'TEMPLATES_MANAGE',
  'REPORTS_VIEW',
];

// Matriz oficial de privilegios por rol — idéntica a auth-service/src/users/users.service.ts.
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

// Deriva la unión (sin duplicados) de privilegios a partir de los roles.
function privilegesForRoles(roles: Role[]): string[] {
  const set = new Set<string>();
  for (const role of roles) {
    for (const privilege of ROLE_PRIVILEGES[role] ?? []) {
      set.add(privilege);
    }
  }
  return [...set];
}

interface SeedUser {
  email: string;
  name: string;
  lastName: string;
  roles: Role[];
  privileges: string[];
  areaId: number | null;
}

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Admin: todos los privilegios, sin área → ve todo.
  const users: SeedUser[] = [
    {
      email: 'admin@aletheia.com',
      name: 'Admin',
      lastName: 'ALETHEIA',
      roles: [Role.ADMINISTRADOR],
      privileges: ALL_PRIVILEGES,
      areaId: null,
    },
    {
      email: 'solicitante@aletheia.com',
      name: 'Solicitante',
      lastName: 'Demo',
      roles: [Role.SOLICITANTE],
      privileges: privilegesForRoles([Role.SOLICITANTE]),
      areaId: 1,
    },
    {
      email: 'abogado@aletheia.com',
      name: 'Abogado',
      lastName: 'Demo',
      roles: [Role.ABOGADO],
      privileges: privilegesForRoles([Role.ABOGADO]),
      areaId: 1,
    },
    {
      email: 'aprobador@aletheia.com',
      name: 'Aprobador',
      lastName: 'Demo',
      roles: [Role.APROBADOR],
      privileges: privilegesForRoles([Role.APROBADOR]),
      areaId: 1,
    },
    {
      email: 'firmante@aletheia.com',
      name: 'Firmante',
      lastName: 'Demo',
      roles: [Role.FIRMANTE],
      privileges: privilegesForRoles([Role.FIRMANTE]),
      areaId: 1,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        lastName: u.lastName,
        password,
        roles: u.roles,
        privileges: u.privileges,
        areaId: u.areaId,
      },
      create: {
        email: u.email,
        name: u.name,
        lastName: u.lastName,
        password,
        roles: u.roles,
        privileges: u.privileges,
        areaId: u.areaId,
      },
    });
    console.log(`✅ Usuario: ${u.email} (${u.roles.join(', ')})`);
  }

  console.log(`✅ Seed auth OK: ${users.length} usuarios (password 'password123')`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

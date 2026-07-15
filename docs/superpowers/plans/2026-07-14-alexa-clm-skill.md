# ALETHEIA CLM Alexa Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 4 backend endpoints the ALETHEIA CLM Alexa Skill needs (real Prisma-backed logic, not mocks), a demo seed so the numbers aren't zero, and the full Alexa-hosted skill project (interaction model + Lambda) that consumes them.

**Architecture:** Backend follows the existing NestJS module pattern (Controller → Service → Repository, guarded by the existing `JwtAuthGuard` + `PrivilegeGuard` + `REPORTS_VIEW`). The Lambda is a small `ask-sdk-core` skill split into pure/testable helpers (`dateRange.js`, `speechBuilders.js`) plus a thin `apiClient.js` (token-caching HTTP client) and `index.js` (SDK wiring only).

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL 16, class-validator, Jest (backend, already configured) — `ask-sdk-core` ^2.14, Node.js 18+, Jest (new, added to `lambda/package.json`).

## Global Constraints

- Locale is `es-MX` only — no other locales.
- No account linking / OAuth. The skill authenticates as a single system user against `POST /auth/login` + `POST /auth/refresh` (already-existing endpoints) — do not build new auth mechanisms.
- All 4 new backend routes require `@UseGuards(JwtAuthGuard, PrivilegeGuard)` + `@RequirePrivilege('REPORTS_VIEW')` — no public endpoints, no new privilege codes.
- Do not touch `WorkflowModule`, `DocumentsModule`, `SignaturesModule`, `NotificationsModule`, `UsersModule`, or the write-side of `ContractsModule` (create/edit/submit/cancel/recover) — out of scope.
- Only two `schema.prisma` changes are in scope: `Contract.expiresAt DateTime?` (new, nullable) and `WorkflowStage.name` gaining `@unique` (needed so `prisma/seed.ts` can `upsert` idempotently). No other model changes.
- No new backend npm dependencies — `bcryptjs`, `class-validator`, `@prisma/client` already cover everything needed.
- Lambda uses the platform's global `fetch` (Node.js 18+ Lambda runtime) — do not add `axios`/`node-fetch`.
- `prisma/seed.ts` must be safe to re-run: catalogs/system-user via `upsert`, demo contracts guarded by a `count() > 0` early-return so re-running never duplicates them.
- Reuse `ContractStatus` exactly as defined in the **real** `schema.prisma` (`DRAFT, SUBMITTED, ADMIN_REVIEW, LAWYER_REVIEW, APPROVAL_PENDING, SIGNING, SIGNED, REJECTED, CANCELLED`) — there is no separate `APPROVED` state; "aprobado(s)" maps to `SIGNING` (approved per business docs).
- All response payloads match exactly what's documented in `ALEXA/ANALISIS_INTENTS.md` sections 4 (backend) — do not rename fields.

---

### Task 0: Fix pre-existing `auth` module compile errors

> **Context:** discovered during worktree setup — `pnpm build` and `pnpm dev` in `clm-system/apps/backend` fail with 8 TypeScript errors that predate this plan (confirmed present since the repo's first commit). They block `pnpm dev`, which Tasks 6 and 9's manual verification steps need. Nothing in this task touches business logic — only type-level fixes so the existing code compiles as originally intended.

**Files:**
- Modify: `clm-system/apps/backend/src/auth/dto/login.dto.ts`
- Modify: `clm-system/apps/backend/src/auth/dto/refresh.dto.ts`
- Modify: `clm-system/apps/backend/src/auth/auth.module.ts`
- Modify: `clm-system/apps/backend/src/auth/auth.service.ts`
- Modify: `clm-system/apps/backend/src/auth/strategies/jwt.strategy.ts`

**Interfaces:**
- Produces: a backend that compiles cleanly with `pnpm build` and runs with `pnpm dev` — required before Task 6/9's manual `curl` verification steps can run. No public interface changes — `LoginDto`, `RefreshDto`, `AuthService`, `JwtStrategy` keep the same shape callers already use.

- [ ] **Step 1: Add definite-assignment assertions to the DTOs**

`class-validator` DTOs are populated by Nest's `ValidationPipe` at runtime, not by a constructor — but `strict: true` in `tsconfig.base.json` requires every property to have an initializer or a definite-assignment assertion (`!`). Update both DTOs:

```typescript
// clm-system/apps/backend/src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
```

```typescript
// clm-system/apps/backend/src/auth/dto/refresh.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
```

- [ ] **Step 2: Fix the `JwtModule.registerAsync` type mismatch in `auth.module.ts`**

The installed `@nestjs/jwt@11` types `signOptions.expiresIn` as `number | StringValue` (a template-literal type from the `ms` package), not plain `string` — `config.get<string>(...)` returns a generic `string`, which TS now rejects. Cast the returned value at the call site (the env var itself is still validated at runtime by `jsonwebtoken`):

```typescript
// clm-system/apps/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrivilegeGuard } from './guards/privilege.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, PrivilegeGuard],
  exports: [JwtAuthGuard, PrivilegeGuard, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 3: Fix the `jwt.sign()` overload mismatch in `auth.service.ts`**

Same `expiresIn` typing issue, this time on the per-call `sign()` options for the refresh token:

```typescript
// clm-system/apps/backend/src/auth/auth.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { UserContext } from './interfaces/user-context.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const payload: UserContext = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      privileges: user.privileges,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as JwtSignOptions['expiresIn'],
    });

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id },
    });

    return { accessToken, refreshToken, privileges: user.privileges };
  }

  async refresh(token: string) {
    const record = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!record || record.revokedAt) throw new UnauthorizedException('Refresh token inválido');

    let payload: UserContext;
    try {
      payload = this.jwt.verify<UserContext>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const accessToken = this.jwt.sign({
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
      privileges: payload.privileges,
    });

    return { accessToken };
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Sesión cerrada' };
  }
}
```

- [ ] **Step 4: Fix `secretOrKey` typing in `jwt.strategy.ts`**

`passport-jwt@4`'s types require `secretOrKey: string | Buffer` (no `undefined`), but `config.get<string>('JWT_SECRET')` returns `string | undefined`. Use `getOrThrow` — this also makes a missing `JWT_SECRET` fail loudly at startup instead of silently signing tokens with `undefined`:

```typescript
// clm-system/apps/backend/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserContext } from '../interfaces/user-context.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: UserContext): UserContext {
    return payload;
  }
}
```

- [ ] **Step 5: Verify the build is clean**

```bash
cd clm-system/apps/backend
pnpm build
```
Expected: no output errors, exits 0 (only the compiled `dist/` output, no `error TS...` lines).

- [ ] **Step 6: Verify the dev server starts**

```bash
pnpm dev
```
Expected: `CLM API running on http://localhost:3000` with no compilation errors, then stop it (Ctrl+C) once confirmed.

- [ ] **Step 7: Commit**

```bash
git add clm-system/apps/backend/src/auth
git commit -m "fix(backend): resolve pre-existing TS strict-mode errors in auth module"
```

---

### Task 1: Prisma schema migration — `Contract.expiresAt` + `WorkflowStage.name` unique

**Files:**
- Modify: `clm-system/apps/backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `Contract.expiresAt: Date | null` (used by Task 4's repository), `WorkflowStage.name` as a unique key (used by Task 2's seed `upsert`).

- [ ] **Step 1: Add `expiresAt` to the `Contract` model**

In `clm-system/apps/backend/prisma/schema.prisma`, find the `Contract` model and add `expiresAt` right after `status`:

```prisma
model Contract {
  id           Int            @id @default(autoincrement())
  title        String
  vendorName   String
  providerType ProviderType
  status       ContractStatus @default(DRAFT)
  expiresAt    DateTime?
  areaId       Int
  societyId    Int
  templateId   Int?
  createdById  Int
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  area          Area             @relation(fields: [areaId], references: [id])
  society       Society          @relation(fields: [societyId], references: [id])
  template      Template?        @relation(fields: [templateId], references: [id])
  createdBy     User             @relation("ContractCreatedBy", fields: [createdById], references: [id])
  documents     Document[]
  workflow      ContractWorkflow?
  signatures    Signature[]
  auditLogs     AuditLog[]
  notifications Notification[]
}
```

- [ ] **Step 2: Make `WorkflowStage.name` unique**

In the same file, update the `WorkflowStage` model:

```prisma
model WorkflowStage {
  id        Int    @id @default(autoincrement())
  name      String @unique
  order     Int
  slaHours  Int    @default(48)
  roleRequired Role

  contractWorkflows ContractWorkflow[]
}
```

- [ ] **Step 3: Start Postgres and run the migration**

```bash
cd clm-system
docker compose -f infra/docker/compose/docker-compose.dev.yml up -d
cd apps/backend
pnpm db:migrate --name add_contract_expires_at_and_stage_unique
```

Expected output ends with:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

- [ ] **Step 4: Verify the Prisma Client picked up the new field**

```bash
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); console.log(Object.keys(p.contract.fields ?? {}))"
```
(If this specific introspection call errors because `.fields` isn't exposed in your Prisma version, it's fine — the real verification is that `pnpm build` in Task 6 type-checks cleanly against `contract.expiresAt`.)

- [ ] **Step 5: Commit**

```bash
git add clm-system/apps/backend/prisma/schema.prisma clm-system/apps/backend/prisma/migrations
git commit -m "feat(backend): add Contract.expiresAt and unique WorkflowStage.name"
```

---

### Task 2: `prisma/seed.ts` — system user + demo data

**Files:**
- Create: `clm-system/apps/backend/prisma/seed.ts`

**Interfaces:**
- Produces: a `User` row `alexa-system@aletheia-clm.com` / password `AlexaSystem#2026` with `roles: [ADMINISTRADOR]` and `privileges` including `REPORTS_VIEW` — this is what Tasks 6, 9, and the Lambda's `CLM_SYSTEM_EMAIL`/`CLM_SYSTEM_PASSWORD` env vars authenticate as. Also produces demo `Contract`/`ContractWorkflow` rows the manual verification steps in Tasks 6 and 9 query against.

- [ ] **Step 1: Write the seed script**

```typescript
// clm-system/apps/backend/prisma/seed.ts
import { ContractStatus, PrismaClient, ProviderType, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PRIVILEGES = [
  'CONTRACT_CREATE', 'CONTRACT_EDIT', 'CONTRACT_SUBMIT', 'CONTRACT_CANCEL', 'CONTRACT_RECOVER',
  'CONTRACT_REVIEW_ADMIN', 'CONTRACT_REVIEW_LAWYER', 'CONTRACT_APPROVE', 'CONTRACT_SIGN',
  'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_AREA', 'DOCUMENT_UPLOAD', 'DOCUMENT_VERSION',
  'WORKFLOW_CONFIG', 'USERS_MANAGE', 'AREAS_MANAGE', 'APODERADOS_MANAGE', 'TEMPLATES_MANAGE',
  'REPORTS_VIEW',
];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const area = await prisma.area.upsert({
    where: { name: 'Legal' },
    update: {},
    create: { name: 'Legal' },
  });

  const society = await prisma.society.upsert({
    where: { name: 'ALETHEIA Holdings' },
    update: {},
    create: { name: 'ALETHEIA Holdings' },
  });

  const systemPassword = await bcrypt.hash('AlexaSystem#2026', 10);
  const systemUser = await prisma.user.upsert({
    where: { email: 'alexa-system@aletheia-clm.com' },
    update: {},
    create: {
      email: 'alexa-system@aletheia-clm.com',
      name: 'Alexa',
      lastName: 'Sistema',
      password: systemPassword,
      roles: [Role.ADMINISTRADOR],
      privileges: ALL_PRIVILEGES,
      areaId: area.id,
    },
  });

  console.log(`Usuario de sistema listo: ${systemUser.email}`);

  const stageDefs = [
    { name: 'Revisión Administrativa', order: 1, slaHours: 48, roleRequired: Role.ADMINISTRADOR },
    { name: 'Revisión Legal', order: 2, slaHours: 24, roleRequired: Role.ABOGADO },
    { name: 'Aprobación Final', order: 3, slaHours: 24, roleRequired: Role.APROBADOR },
  ];

  const stagesByName = new Map<string, { id: number }>();
  for (const def of stageDefs) {
    const stage = await prisma.workflowStage.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    stagesByName.set(def.name, stage);
  }

  const existingContracts = await prisma.contract.count();
  if (existingContracts > 0) {
    console.log(`Ya existen ${existingContracts} contratos, se omite el seed de datos de demo.`);
    return;
  }

  const contractsData = [
    {
      title: 'Servicio de limpieza anual',
      vendorName: 'CleanCorp SA',
      providerType: ProviderType.MORAL,
      status: ContractStatus.SIGNED,
      expiresAt: daysFromNow(10),
      updatedAt: new Date(),
    },
    {
      title: 'Licencias software contable',
      vendorName: 'SoftBooks',
      providerType: ProviderType.MORAL,
      status: ContractStatus.SIGNED,
      expiresAt: daysFromNow(25),
      updatedAt: daysAgo(5),
    },
    {
      title: 'Consultoría fiscal',
      vendorName: 'Fiscal Partners',
      providerType: ProviderType.FISICA,
      status: ContractStatus.REJECTED,
      expiresAt: null,
      updatedAt: new Date(),
    },
    {
      title: 'Renta de oficina',
      vendorName: 'Inmobiliaria Sol',
      providerType: ProviderType.MORAL,
      status: ContractStatus.REJECTED,
      expiresAt: null,
      updatedAt: daysAgo(20),
    },
    {
      title: 'Seguro de responsabilidad civil',
      vendorName: 'Seguros Confianza',
      providerType: ProviderType.MORAL,
      status: ContractStatus.SUBMITTED,
      expiresAt: null,
      updatedAt: new Date(),
    },
    {
      title: 'Contrato de arrendamiento bodega',
      vendorName: 'Logística Norte',
      providerType: ProviderType.MORAL,
      status: ContractStatus.DRAFT,
      expiresAt: null,
      updatedAt: new Date(),
    },
  ];

  const workflowContractsData = [
    {
      title: 'Mantenimiento de flotilla',
      vendorName: 'AutoFix',
      providerType: ProviderType.MORAL,
      status: ContractStatus.ADMIN_REVIEW,
      stageName: 'Revisión Administrativa',
      enteredAt: hoursAgo(72), // sla 48h -> vencido
    },
    {
      title: 'Publicidad digital Q3',
      vendorName: 'AdWave',
      providerType: ProviderType.MORAL,
      status: ContractStatus.LAWYER_REVIEW,
      stageName: 'Revisión Legal',
      enteredAt: hoursAgo(30), // sla 24h -> vencido
    },
    {
      title: 'Auditoría anual',
      vendorName: 'AuditPro',
      providerType: ProviderType.MORAL,
      status: ContractStatus.LAWYER_REVIEW,
      stageName: 'Revisión Legal',
      enteredAt: hoursAgo(40), // sla 24h -> vencido
    },
    {
      title: 'Compra de mobiliario',
      vendorName: 'Muebles del Centro',
      providerType: ProviderType.MORAL,
      status: ContractStatus.APPROVAL_PENDING,
      stageName: 'Aprobación Final',
      enteredAt: hoursAgo(2), // sla 24h -> dentro de tiempo
    },
  ];

  for (const data of contractsData) {
    await prisma.contract.create({
      data: {
        title: data.title,
        vendorName: data.vendorName,
        providerType: data.providerType,
        status: data.status,
        expiresAt: data.expiresAt,
        updatedAt: data.updatedAt,
        areaId: area.id,
        societyId: society.id,
        createdById: systemUser.id,
      },
    });
  }

  for (const data of workflowContractsData) {
    const stage = stagesByName.get(data.stageName);
    if (!stage) throw new Error(`Etapa no encontrada: ${data.stageName}`);

    const contract = await prisma.contract.create({
      data: {
        title: data.title,
        vendorName: data.vendorName,
        providerType: data.providerType,
        status: data.status,
        areaId: area.id,
        societyId: society.id,
        createdById: systemUser.id,
      },
    });

    await prisma.contractWorkflow.create({
      data: {
        contractId: contract.id,
        stageId: stage.id,
        enteredAt: data.enteredAt,
      },
    });
  }

  console.log(
    `Seed de demo completo: ${contractsData.length + workflowContractsData.length} contratos creados.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the seed**

```bash
cd clm-system/apps/backend
pnpm db:seed
```

Expected output:
```
Usuario de sistema listo: alexa-system@aletheia-clm.com
Seed de demo completo: 10 contratos creados.
```

- [ ] **Step 3: Verify idempotency — run it again**

```bash
pnpm db:seed
```

Expected output (no duplicate contracts created):
```
Usuario de sistema listo: alexa-system@aletheia-clm.com
Ya existen 10 contratos, se omite el seed de datos de demo.
```

- [ ] **Step 4: Commit**

```bash
git add clm-system/apps/backend/prisma/seed.ts
git commit -m "feat(backend): add demo seed with system user and sample contracts"
```

---

### Task 3: Common date-range utility

**Files:**
- Create: `clm-system/apps/backend/src/common/utils/date-range.util.ts`
- Test: `clm-system/apps/backend/src/common/utils/date-range.util.spec.ts`

**Interfaces:**
- Produces: `startOfDayUTC(isoDate: string): Date`, `endOfDayUTC(isoDate: string): Date`, `todayISODate(): string` — consumed by Task 4 (`ContractsRepository`/`ContractsService`) and Task 7/8 (`ReportsRepository`/`ReportsService`).

- [ ] **Step 1: Write the failing test**

```typescript
// clm-system/apps/backend/src/common/utils/date-range.util.spec.ts
import { endOfDayUTC, startOfDayUTC, todayISODate } from './date-range.util';

describe('date-range.util', () => {
  describe('startOfDayUTC', () => {
    it('returns midnight UTC for a plain date string', () => {
      const result = startOfDayUTC('2026-06-15');
      expect(result.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    });
  });

  describe('endOfDayUTC', () => {
    it('returns the last millisecond of the day in UTC', () => {
      const result = endOfDayUTC('2026-06-15');
      expect(result.toISOString()).toBe('2026-06-15T23:59:59.999Z');
    });
  });

  describe('todayISODate', () => {
    it('returns a string matching YYYY-MM-DD', () => {
      expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd clm-system/apps/backend && pnpm jest date-range.util --no-coverage`
Expected: FAIL — `Cannot find module './date-range.util'`

- [ ] **Step 3: Write the implementation**

```typescript
// clm-system/apps/backend/src/common/utils/date-range.util.ts
export function startOfDayUTC(isoDate: string): Date {
  const date = new Date(isoDate);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function endOfDayUTC(isoDate: string): Date {
  const date = new Date(isoDate);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest date-range.util --no-coverage`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add clm-system/apps/backend/src/common/utils/date-range.util.ts clm-system/apps/backend/src/common/utils/date-range.util.spec.ts
git commit -m "feat(backend): add date-range utility for UTC day boundaries"
```

---

### Task 4: `ContractsRepository`

**Files:**
- Create: `clm-system/apps/backend/src/contracts/contracts.repository.ts`
- Test: `clm-system/apps/backend/src/contracts/contracts.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (from `../prisma/prisma.service`, globally available).
- Produces: `ContractsRepository.findExpiring(start: Date, end: Date): Promise<Contract[]>` (ordered ascending by `expiresAt`), `ContractsRepository.countByStatusInRange(status: ContractStatus, start: Date, end: Date): Promise<number>` — both consumed by Task 5's `ContractsService`.

- [ ] **Step 1: Write the failing test**

```typescript
// clm-system/apps/backend/src/contracts/contracts.repository.spec.ts
import { ContractsRepository } from './contracts.repository';

describe('ContractsRepository', () => {
  function buildPrismaMock() {
    return {
      contract: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
  }

  it('findExpiring queries by expiresAt range ordered ascending', async () => {
    const prisma = buildPrismaMock();
    const repo = new ContractsRepository(prisma as any);
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-30T23:59:59.999Z');
    prisma.contract.findMany.mockResolvedValue([]);

    await repo.findExpiring(start, end);

    expect(prisma.contract.findMany).toHaveBeenCalledWith({
      where: { expiresAt: { gte: start, lte: end } },
      orderBy: { expiresAt: 'asc' },
    });
  });

  it('countByStatusInRange filters by status and updatedAt range', async () => {
    const prisma = buildPrismaMock();
    const repo = new ContractsRepository(prisma as any);
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-30T23:59:59.999Z');
    prisma.contract.count.mockResolvedValue(4);

    const result = await repo.countByStatusInRange('REJECTED' as any, start, end);

    expect(result).toBe(4);
    expect(prisma.contract.count).toHaveBeenCalledWith({
      where: { status: 'REJECTED', updatedAt: { gte: start, lte: end } },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest contracts.repository --no-coverage`
Expected: FAIL — `Cannot find module './contracts.repository'`

- [ ] **Step 3: Write the implementation**

```typescript
// clm-system/apps/backend/src/contracts/contracts.repository.ts
import { Injectable } from '@nestjs/common';
import type { Contract, ContractStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findExpiring(start: Date, end: Date): Promise<Contract[]> {
    return this.prisma.contract.findMany({
      where: {
        expiresAt: { gte: start, lte: end },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  countByStatusInRange(status: ContractStatus, start: Date, end: Date): Promise<number> {
    return this.prisma.contract.count({
      where: {
        status,
        updatedAt: { gte: start, lte: end },
      },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest contracts.repository --no-coverage`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add clm-system/apps/backend/src/contracts/contracts.repository.ts clm-system/apps/backend/src/contracts/contracts.repository.spec.ts
git commit -m "feat(backend): add ContractsRepository for expiring/metrics queries"
```

---

### Task 5: `ContractsService`

**Files:**
- Create: `clm-system/apps/backend/src/contracts/contracts.service.ts`
- Test: `clm-system/apps/backend/src/contracts/contracts.service.spec.ts`

**Interfaces:**
- Consumes: `ContractsRepository.findExpiring`, `ContractsRepository.countByStatusInRange` (Task 4), `startOfDayUTC`/`endOfDayUTC` (Task 3).
- Produces: `ContractsService.getExpiring(startDate: string, endDate: string): Promise<{count, contratos, masUrgente}>`, `ContractsService.getMetrics(status, startDate, endDate): Promise<{status, startDate, endDate, count}>` — both consumed by Task 6's controller. Throws `BadRequestException` when `startDate > endDate`.

- [ ] **Step 1: Write the failing test**

```typescript
// clm-system/apps/backend/src/contracts/contracts.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ContractsRepository } from './contracts.repository';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  function buildRepoMock() {
    return {
      findExpiring: jest.fn(),
      countByStatusInRange: jest.fn(),
    } as unknown as jest.Mocked<ContractsRepository>;
  }

  describe('getExpiring', () => {
    it('throws BadRequestException when startDate is after endDate', async () => {
      const repo = buildRepoMock();
      const service = new ContractsService(repo);

      await expect(service.getExpiring('2026-07-10', '2026-07-01')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns count 0 and masUrgente null when there are no expiring contracts', async () => {
      const repo = buildRepoMock();
      repo.findExpiring.mockResolvedValue([]);
      const service = new ContractsService(repo);

      const result = await service.getExpiring('2026-07-01', '2026-07-31');

      expect(result).toEqual({ count: 0, contratos: [], masUrgente: null });
    });

    it('maps contracts and picks the first (soonest) as masUrgente', async () => {
      const repo = buildRepoMock();
      repo.findExpiring.mockResolvedValue([
        {
          id: 1,
          title: 'Renovación licencias',
          vendorName: 'Acme S.A.',
          status: 'SIGNED',
          expiresAt: new Date('2026-07-20T00:00:00.000Z'),
        } as any,
      ]);
      const service = new ContractsService(repo);

      const result = await service.getExpiring('2026-07-01', '2026-07-31');

      expect(result.count).toBe(1);
      expect(result.masUrgente).toEqual({
        id: 1,
        title: 'Renovación licencias',
        vendorName: 'Acme S.A.',
        status: 'SIGNED',
        expiresAt: '2026-07-20',
      });
    });
  });

  describe('getMetrics', () => {
    it('throws BadRequestException when startDate is after endDate', async () => {
      const repo = buildRepoMock();
      const service = new ContractsService(repo);

      await expect(
        service.getMetrics('REJECTED' as any, '2026-07-10', '2026-07-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the count from the repository', async () => {
      const repo = buildRepoMock();
      repo.countByStatusInRange.mockResolvedValue(4);
      const service = new ContractsService(repo);

      const result = await service.getMetrics('REJECTED' as any, '2026-06-01', '2026-06-30');

      expect(result).toEqual({
        status: 'REJECTED',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        count: 4,
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest contracts.service --no-coverage`
Expected: FAIL — `Cannot find module './contracts.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// clm-system/apps/backend/src/contracts/contracts.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ContractStatus } from '@prisma/client';
import { endOfDayUTC, startOfDayUTC } from '../common/utils/date-range.util';
import { ContractsRepository } from './contracts.repository';

export interface ContractSummary {
  id: number;
  title: string;
  vendorName: string;
  status: string;
  expiresAt: string | null;
}

export interface ExpiringContractsResult {
  count: number;
  contratos: ContractSummary[];
  masUrgente: ContractSummary | null;
}

export interface ContractsMetricsResult {
  status: string;
  startDate: string;
  endDate: string;
  count: number;
}

@Injectable()
export class ContractsService {
  constructor(private readonly contractsRepository: ContractsRepository) {}

  private assertValidRange(startDate: string, endDate: string): void {
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new BadRequestException('startDate debe ser anterior o igual a endDate');
    }
  }

  async getExpiring(startDate: string, endDate: string): Promise<ExpiringContractsResult> {
    this.assertValidRange(startDate, endDate);

    const contracts = await this.contractsRepository.findExpiring(
      startOfDayUTC(startDate),
      endOfDayUTC(endDate),
    );

    const contratos: ContractSummary[] = contracts.map((c) => ({
      id: c.id,
      title: c.title,
      vendorName: c.vendorName,
      status: c.status,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : null,
    }));

    return {
      count: contratos.length,
      contratos,
      masUrgente: contratos[0] ?? null,
    };
  }

  async getMetrics(
    status: ContractStatus,
    startDate: string,
    endDate: string,
  ): Promise<ContractsMetricsResult> {
    this.assertValidRange(startDate, endDate);

    const count = await this.contractsRepository.countByStatusInRange(
      status,
      startOfDayUTC(startDate),
      endOfDayUTC(endDate),
    );

    return { status, startDate, endDate, count };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest contracts.service --no-coverage`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add clm-system/apps/backend/src/contracts/contracts.service.ts clm-system/apps/backend/src/contracts/contracts.service.spec.ts
git commit -m "feat(backend): add ContractsService with date-range validation"
```

---

### Task 6: Contracts DTOs + Controller + Module (manual verification)

**Files:**
- Create: `clm-system/apps/backend/src/contracts/dto/date-range-query.dto.ts`
- Create: `clm-system/apps/backend/src/contracts/dto/contracts-metrics-query.dto.ts`
- Create: `clm-system/apps/backend/src/contracts/contracts.controller.ts`
- Modify: `clm-system/apps/backend/src/contracts/contracts.module.ts`

**Interfaces:**
- Consumes: `ContractsService.getExpiring`/`getMetrics` (Task 5), `JwtAuthGuard`/`PrivilegeGuard`/`RequirePrivilege` (existing `../auth/*`).
- Produces: `GET /contracts/expiring?startDate=&endDate=`, `GET /contracts/metrics?status=&startDate=&endDate=` — consumed by the Lambda's `apiClient.js` (Task 14).

- [ ] **Step 1: Write the date-range query DTO**

```typescript
// clm-system/apps/backend/src/contracts/dto/date-range-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'Fecha de inicio (ISO 8601)' })
  @IsISO8601()
  startDate: string;

  @ApiProperty({ example: '2026-06-30', description: 'Fecha de fin (ISO 8601)' })
  @IsISO8601()
  endDate: string;
}
```

- [ ] **Step 2: Write the metrics query DTO**

```typescript
// clm-system/apps/backend/src/contracts/dto/contracts-metrics-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { DateRangeQueryDto } from './date-range-query.dto';

export class ContractsMetricsQueryDto extends DateRangeQueryDto {
  @ApiProperty({ enum: ContractStatus, example: ContractStatus.REJECTED })
  @IsEnum(ContractStatus)
  status: ContractStatus;
}
```

- [ ] **Step 3: Write the controller**

```typescript
// clm-system/apps/backend/src/contracts/contracts.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { ContractsMetricsQueryDto } from './dto/contracts-metrics-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { ContractsService } from './contracts.service';

// IMPORTANTE: las rutas estáticas (expiring, metrics) deben declararse antes de
// cualquier futura ruta dinámica GET /contracts/:id — si :id se agrega antes,
// Nest interpretaría "expiring"/"metrics" como el valor de :id.
@ApiTags('contracts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('expiring')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Contratos próximos a vencer en un rango de fechas' })
  getExpiring(@Query() query: DateRangeQueryDto) {
    return this.contractsService.getExpiring(query.startDate, query.endDate);
  }

  @Get('metrics')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Cantidad de contratos por estado en un rango de fechas' })
  getMetrics(@Query() query: ContractsMetricsQueryDto) {
    return this.contractsService.getMetrics(query.status, query.startDate, query.endDate);
  }
}
```

- [ ] **Step 4: Wire the module**

```typescript
// clm-system/apps/backend/src/contracts/contracts.module.ts
import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsRepository } from './contracts.repository';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, ContractsRepository],
})
export class ContractsModule {}
```

- [ ] **Step 5: Start the backend**

```bash
cd clm-system/apps/backend
pnpm dev
```
Expected: `CLM API running on http://localhost:3000` with no startup errors.

- [ ] **Step 6: Verify the guard rejects unauthenticated requests**

```bash
curl -i http://localhost:3000/contracts/expiring?startDate=2026-07-01&endDate=2026-07-31
```
Expected: `HTTP/1.1 401 Unauthorized`

- [ ] **Step 7: Log in as the seeded system user and verify real data**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alexa-system@aletheia-clm.com","password":"AlexaSystem#2026"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')

curl -s "http://localhost:3000/contracts/expiring?startDate=2026-07-01&endDate=2026-08-31" \
  -H "Authorization: Bearer $TOKEN" | node -pe 'JSON.stringify(JSON.parse(require("fs").readFileSync(0)), null, 2)'
```
Expected: `data.count` is `2` (the two `SIGNED` contracts from the seed with `expiresAt` in that window), `data.masUrgente.vendorName` is `"CleanCorp SA"`.

```bash
curl -s "http://localhost:3000/contracts/metrics?status=REJECTED&startDate=2026-06-01&endDate=2026-07-31" \
  -H "Authorization: Bearer $TOKEN" | node -pe 'JSON.stringify(JSON.parse(require("fs").readFileSync(0)), null, 2)'
```
Expected: `data.count` is `2` (both seeded `REJECTED` contracts fall in that range).

- [ ] **Step 8: Verify DTO validation rejects a bad status**

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/contracts/metrics?status=NOT_A_STATUS&startDate=2026-06-01&endDate=2026-07-31" \
  -H "Authorization: Bearer $TOKEN"
```
Expected: `400`

- [ ] **Step 9: Commit**

```bash
git add clm-system/apps/backend/src/contracts/dto clm-system/apps/backend/src/contracts/contracts.controller.ts clm-system/apps/backend/src/contracts/contracts.module.ts
git commit -m "feat(backend): expose GET /contracts/expiring and /contracts/metrics"
```

---

### Task 7: `ReportsRepository`

**Files:**
- Create: `clm-system/apps/backend/src/reports/reports.repository.ts`
- Test: `clm-system/apps/backend/src/reports/reports.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `ReportsRepository.countActiveContracts(excludedStatuses: ContractStatus[]): Promise<number>`, `ReportsRepository.countByStatusUpdatedInRange(status, start, end): Promise<number>`, `ReportsRepository.findActiveWorkflowsWithStage(): Promise<StageWorkflowRow[]>` where `StageWorkflowRow = { stageId: number; stageName: string; slaHours: number; enteredAt: Date }` — all consumed by Task 8's `ReportsService`.

- [ ] **Step 1: Write the failing test**

```typescript
// clm-system/apps/backend/src/reports/reports.repository.spec.ts
import { ReportsRepository } from './reports.repository';

describe('ReportsRepository', () => {
  function buildPrismaMock() {
    return {
      contract: { count: jest.fn() },
      contractWorkflow: { findMany: jest.fn() },
    };
  }

  it('countActiveContracts excludes the given statuses', async () => {
    const prisma = buildPrismaMock();
    prisma.contract.count.mockResolvedValue(7);
    const repo = new ReportsRepository(prisma as any);

    const result = await repo.countActiveContracts(['SIGNED', 'REJECTED', 'CANCELLED'] as any);

    expect(result).toBe(7);
    expect(prisma.contract.count).toHaveBeenCalledWith({
      where: { status: { notIn: ['SIGNED', 'REJECTED', 'CANCELLED'] } },
    });
  });

  it('findActiveWorkflowsWithStage flattens the joined stage fields', async () => {
    const prisma = buildPrismaMock();
    const enteredAt = new Date('2026-07-10T00:00:00.000Z');
    prisma.contractWorkflow.findMany.mockResolvedValue([
      {
        id: 1,
        contractId: 1,
        stageId: 2,
        enteredAt,
        comment: null,
        stage: { id: 2, name: 'Revisión Legal', order: 2, slaHours: 24, roleRequired: 'ABOGADO' },
      },
    ]);
    const repo = new ReportsRepository(prisma as any);

    const result = await repo.findActiveWorkflowsWithStage();

    expect(result).toEqual([{ stageId: 2, stageName: 'Revisión Legal', slaHours: 24, enteredAt }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest reports.repository --no-coverage`
Expected: FAIL — `Cannot find module './reports.repository'`

- [ ] **Step 3: Write the implementation**

```typescript
// clm-system/apps/backend/src/reports/reports.repository.ts
import { Injectable } from '@nestjs/common';
import type { ContractStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StageWorkflowRow {
  stageId: number;
  stageName: string;
  slaHours: number;
  enteredAt: Date;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveContracts(excludedStatuses: ContractStatus[]): Promise<number> {
    return this.prisma.contract.count({
      where: { status: { notIn: excludedStatuses } },
    });
  }

  countByStatusUpdatedInRange(status: ContractStatus, start: Date, end: Date): Promise<number> {
    return this.prisma.contract.count({
      where: { status, updatedAt: { gte: start, lte: end } },
    });
  }

  async findActiveWorkflowsWithStage(): Promise<StageWorkflowRow[]> {
    const rows = await this.prisma.contractWorkflow.findMany({
      include: { stage: true },
    });

    return rows.map((row) => ({
      stageId: row.stage.id,
      stageName: row.stage.name,
      slaHours: row.stage.slaHours,
      enteredAt: row.enteredAt,
    }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest reports.repository --no-coverage`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add clm-system/apps/backend/src/reports/reports.repository.ts clm-system/apps/backend/src/reports/reports.repository.spec.ts
git commit -m "feat(backend): add ReportsRepository for daily-summary/bottlenecks queries"
```

---

### Task 8: `ReportsService`

**Files:**
- Create: `clm-system/apps/backend/src/reports/reports.service.ts`
- Test: `clm-system/apps/backend/src/reports/reports.service.spec.ts`

**Interfaces:**
- Consumes: `ReportsRepository.countActiveContracts`/`countByStatusUpdatedInRange`/`findActiveWorkflowsWithStage` (Task 7), `startOfDayUTC`/`endOfDayUTC`/`todayISODate` (Task 3).
- Produces: `ReportsService.getDailySummary(): Promise<{pendientes, firmados, rechazados, fecha}>`, `ReportsService.getBottlenecks(): Promise<{etapas: StageBottleneck[], peor: StageBottleneck | null}>` where `StageBottleneck = {stageId, stageName, cantidadVencidos}` — both consumed by Task 9's controller.

- [ ] **Step 1: Write the failing test**

```typescript
// clm-system/apps/backend/src/reports/reports.service.spec.ts
import { ContractStatus } from '@prisma/client';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  function buildRepoMock() {
    return {
      countActiveContracts: jest.fn(),
      countByStatusUpdatedInRange: jest.fn(),
      findActiveWorkflowsWithStage: jest.fn(),
    } as unknown as jest.Mocked<ReportsRepository>;
  }

  describe('getDailySummary', () => {
    it('combines pendientes, firmados and rechazados for today', async () => {
      const repo = buildRepoMock();
      repo.countActiveContracts.mockResolvedValue(12);
      repo.countByStatusUpdatedInRange
        .mockResolvedValueOnce(3) // firmados
        .mockResolvedValueOnce(1); // rechazados
      const service = new ReportsService(repo);

      const result = await service.getDailySummary();

      expect(result.pendientes).toBe(12);
      expect(result.firmados).toBe(3);
      expect(result.rechazados).toBe(1);
      expect(result.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(repo.countActiveContracts).toHaveBeenCalledWith([
        ContractStatus.SIGNED,
        ContractStatus.REJECTED,
        ContractStatus.CANCELLED,
      ]);
    });
  });

  describe('getBottlenecks', () => {
    it('returns etapas vacías y peor null cuando nada está vencido', async () => {
      const repo = buildRepoMock();
      repo.findActiveWorkflowsWithStage.mockResolvedValue([
        { stageId: 1, stageName: 'Revisión Administrativa', slaHours: 48, enteredAt: new Date() },
      ]);
      const service = new ReportsService(repo);

      const result = await service.getBottlenecks();

      expect(result).toEqual({ etapas: [], peor: null });
    });

    it('agrupa por etapa y ordena descendente por cantidad vencida', async () => {
      const repo = buildRepoMock();
      const longAgo = new Date(Date.now() - 100 * 60 * 60 * 1000); // 100h atrás
      repo.findActiveWorkflowsWithStage.mockResolvedValue([
        { stageId: 1, stageName: 'Revisión Administrativa', slaHours: 48, enteredAt: longAgo },
        { stageId: 2, stageName: 'Revisión Legal', slaHours: 24, enteredAt: longAgo },
        { stageId: 2, stageName: 'Revisión Legal', slaHours: 24, enteredAt: longAgo },
      ]);
      const service = new ReportsService(repo);

      const result = await service.getBottlenecks();

      expect(result.etapas).toEqual([
        { stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 },
        { stageId: 1, stageName: 'Revisión Administrativa', cantidadVencidos: 1 },
      ]);
      expect(result.peor).toEqual({
        stageId: 2,
        stageName: 'Revisión Legal',
        cantidadVencidos: 2,
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest reports.service --no-coverage`
Expected: FAIL — `Cannot find module './reports.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// clm-system/apps/backend/src/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import { endOfDayUTC, startOfDayUTC, todayISODate } from '../common/utils/date-range.util';
import { ReportsRepository } from './reports.repository';

const CLOSED_STATUSES: ContractStatus[] = [
  ContractStatus.SIGNED,
  ContractStatus.REJECTED,
  ContractStatus.CANCELLED,
];

export interface DailySummaryResult {
  pendientes: number;
  firmados: number;
  rechazados: number;
  fecha: string;
}

export interface StageBottleneck {
  stageId: number;
  stageName: string;
  cantidadVencidos: number;
}

export interface BottlenecksResult {
  etapas: StageBottleneck[];
  peor: StageBottleneck | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getDailySummary(): Promise<DailySummaryResult> {
    const fecha = todayISODate();
    const start = startOfDayUTC(fecha);
    const end = endOfDayUTC(fecha);

    const [pendientes, firmados, rechazados] = await Promise.all([
      this.reportsRepository.countActiveContracts(CLOSED_STATUSES),
      this.reportsRepository.countByStatusUpdatedInRange(ContractStatus.SIGNED, start, end),
      this.reportsRepository.countByStatusUpdatedInRange(ContractStatus.REJECTED, start, end),
    ]);

    return { pendientes, firmados, rechazados, fecha };
  }

  async getBottlenecks(): Promise<BottlenecksResult> {
    const rows = await this.reportsRepository.findActiveWorkflowsWithStage();
    const now = Date.now();

    const overdueCountByStage = new Map<number, StageBottleneck>();

    for (const row of rows) {
      const hoursElapsed = (now - row.enteredAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed < row.slaHours) continue;

      const existing = overdueCountByStage.get(row.stageId);
      if (existing) {
        existing.cantidadVencidos += 1;
      } else {
        overdueCountByStage.set(row.stageId, {
          stageId: row.stageId,
          stageName: row.stageName,
          cantidadVencidos: 1,
        });
      }
    }

    const etapas = Array.from(overdueCountByStage.values()).sort(
      (a, b) => b.cantidadVencidos - a.cantidadVencidos,
    );

    return { etapas, peor: etapas[0] ?? null };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest reports.service --no-coverage`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add clm-system/apps/backend/src/reports/reports.service.ts clm-system/apps/backend/src/reports/reports.service.spec.ts
git commit -m "feat(backend): add ReportsService with SLA-overdue grouping"
```

---

### Task 9: Reports Controller + Module (manual verification)

**Files:**
- Create: `clm-system/apps/backend/src/reports/reports.controller.ts`
- Modify: `clm-system/apps/backend/src/reports/reports.module.ts`

**Interfaces:**
- Consumes: `ReportsService.getDailySummary`/`getBottlenecks` (Task 8).
- Produces: `GET /reports/daily-summary`, `GET /reports/bottlenecks` — consumed by the Lambda's `apiClient.js` (Task 14).

- [ ] **Step 1: Write the controller**

```typescript
// clm-system/apps/backend/src/reports/reports.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Resumen ejecutivo del día: pendientes, firmados, rechazados' })
  getDailySummary() {
    return this.reportsService.getDailySummary();
  }

  @Get('bottlenecks')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Etapas del flujo con contratos que superaron su SLA' })
  getBottlenecks() {
    return this.reportsService.getBottlenecks();
  }
}
```

- [ ] **Step 2: Wire the module**

```typescript
// clm-system/apps/backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
```

- [ ] **Step 3: Restart the backend and verify (reuse `$TOKEN` from Task 6, Step 7)**

```bash
curl -s http://localhost:3000/reports/daily-summary \
  -H "Authorization: Bearer $TOKEN" | node -pe 'JSON.stringify(JSON.parse(require("fs").readFileSync(0)), null, 2)'
```
Expected: `data.pendientes` is `6`, `data.firmados` is `1`, `data.rechazados` is `1` (per the seed dataset in Task 2).

```bash
curl -s http://localhost:3000/reports/bottlenecks \
  -H "Authorization: Bearer $TOKEN" | node -pe 'JSON.stringify(JSON.parse(require("fs").readFileSync(0)), null, 2)'
```
Expected: `data.peor.stageName` is `"Revisión Legal"`, `data.peor.cantidadVencidos` is `2`.

- [ ] **Step 4: Commit**

```bash
git add clm-system/apps/backend/src/reports/reports.controller.ts clm-system/apps/backend/src/reports/reports.module.ts
git commit -m "feat(backend): expose GET /reports/daily-summary and /reports/bottlenecks"
```

---

### Task 10: Alexa interaction model (`es-MX`)

**Files:**
- Create: `ALEXA/skill-package/interactionModels/custom/es-MX.json`

**Interfaces:**
- Produces: the 6 intents (`ResumenEjecutivoIntent`, `ConsultarMetricasPorFechaIntent`, `ConsultarContratosPorExpirarIntent`, `AlertaCuelloDeBotellaIntent`, `HelpIntent`, plus `AMAZON.CancelIntent`/`StopIntent`/`FallbackIntent`) and the `EstadoContratoType` slot type (with `id` values matching `ContractStatus` exactly) that Task 15's `index.js` handlers key off of via `Alexa.getIntentName(...)` and `slots.estadoContrato.resolutions...values[0].value.id`.

- [ ] **Step 1: Write the interaction model**

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "aletheia clm",
      "intents": [
        { "name": "AMAZON.CancelIntent", "samples": [] },
        { "name": "AMAZON.StopIntent", "samples": [] },
        { "name": "AMAZON.FallbackIntent", "samples": [] },
        {
          "name": "HelpIntent",
          "samples": ["ayuda", "qué puedo decir", "opciones"]
        },
        {
          "name": "ResumenEjecutivoIntent",
          "samples": [
            "dame mi resumen del día",
            "reporte ejecutivo de contratos",
            "cómo vamos con los contratos",
            "dame el resumen ejecutivo",
            "cuál es mi resumen del día"
          ]
        },
        {
          "name": "AlertaCuelloDeBotellaIntent",
          "samples": [
            "dónde están atorados los contratos",
            "qué etapa tiene más contratos pendientes",
            "reporte de cuellos de botella",
            "dime los cuellos de botella",
            "dónde hay cuellos de botella"
          ]
        },
        {
          "name": "ConsultarContratosPorExpirarIntent",
          "slots": [
            {
              "name": "rangoFecha",
              "type": "AMAZON.DATE",
              "samples": ["{rangoFecha}", "en {rangoFecha}", "para {rangoFecha}"]
            }
          ],
          "samples": [
            "qué contratos vencen {rangoFecha}",
            "dime qué acuerdos expiran {rangoFecha}",
            "contratos a punto de caducar",
            "contratos por vencer {rangoFecha}",
            "qué contratos vencen en {rangoFecha}",
            "acuerdos que expiran {rangoFecha}"
          ]
        },
        {
          "name": "ConsultarMetricasPorFechaIntent",
          "slots": [
            {
              "name": "rangoFecha",
              "type": "AMAZON.DATE",
              "samples": ["{rangoFecha}", "en {rangoFecha}", "para {rangoFecha}"]
            },
            {
              "name": "estadoContrato",
              "type": "EstadoContratoType",
              "samples": ["{estadoContrato}", "el estado {estadoContrato}", "contratos {estadoContrato}"]
            }
          ],
          "samples": [
            "cuántos contratos fueron {estadoContrato} {rangoFecha}",
            "dime los contratos {estadoContrato} {rangoFecha}",
            "resumen de contratos {estadoContrato} {rangoFecha}",
            "contratos {estadoContrato} {rangoFecha}",
            "cuántos contratos {estadoContrato} hay {rangoFecha}",
            "dame los contratos {estadoContrato} de {rangoFecha}"
          ]
        }
      ],
      "types": [
        {
          "name": "EstadoContratoType",
          "values": [
            { "id": "DRAFT", "name": { "value": "borrador", "synonyms": ["borradores", "en borrador"] } },
            { "id": "SUBMITTED", "name": { "value": "enviado", "synonyms": ["enviados", "enviada", "enviadas"] } },
            {
              "id": "ADMIN_REVIEW",
              "name": {
                "value": "en revisión del administrador",
                "synonyms": ["revisión administrativa", "revisión de administrador"]
              }
            },
            {
              "id": "LAWYER_REVIEW",
              "name": {
                "value": "en revisión del abogado",
                "synonyms": ["revisión legal", "revisión de abogado"]
              }
            },
            {
              "id": "APPROVAL_PENDING",
              "name": {
                "value": "pendiente de aprobación",
                "synonyms": ["pendientes de aprobación", "por aprobar"]
              }
            },
            {
              "id": "SIGNING",
              "name": {
                "value": "en firma",
                "synonyms": ["por firmar", "en proceso de firma", "aprobado", "aprobados"]
              }
            },
            { "id": "SIGNED", "name": { "value": "firmado", "synonyms": ["firmados", "firmada", "firmadas"] } },
            {
              "id": "REJECTED",
              "name": { "value": "rechazado", "synonyms": ["rechazados", "rechazada", "rechazadas"] }
            },
            {
              "id": "CANCELLED",
              "name": { "value": "cancelado", "synonyms": ["cancelados", "cancelada", "canceladas"] }
            }
          ]
        }
      ]
    },
    "dialog": {
      "intents": [
        {
          "name": "ConsultarContratosPorExpirarIntent",
          "confirmationRequired": false,
          "prompts": {},
          "slots": [
            {
              "name": "rangoFecha",
              "type": "AMAZON.DATE",
              "confirmationRequired": false,
              "elicitationRequired": true,
              "prompts": {
                "elicitation": "Elicit.Slot.ConsultarContratosPorExpirarIntent.rangoFecha"
              }
            }
          ]
        },
        {
          "name": "ConsultarMetricasPorFechaIntent",
          "confirmationRequired": false,
          "prompts": {},
          "slots": [
            {
              "name": "rangoFecha",
              "type": "AMAZON.DATE",
              "confirmationRequired": false,
              "elicitationRequired": true,
              "prompts": {
                "elicitation": "Elicit.Slot.ConsultarMetricasPorFechaIntent.rangoFecha"
              }
            },
            {
              "name": "estadoContrato",
              "type": "EstadoContratoType",
              "confirmationRequired": false,
              "elicitationRequired": true,
              "prompts": {
                "elicitation": "Elicit.Slot.ConsultarMetricasPorFechaIntent.estadoContrato"
              }
            }
          ]
        }
      ]
    },
    "prompts": [
      {
        "id": "Elicit.Slot.ConsultarContratosPorExpirarIntent.rangoFecha",
        "variations": [
          { "type": "PlainText", "value": "¿Para qué periodo deseas consultar esta información?" }
        ]
      },
      {
        "id": "Elicit.Slot.ConsultarMetricasPorFechaIntent.rangoFecha",
        "variations": [
          { "type": "PlainText", "value": "¿Para qué periodo deseas consultar esta información?" }
        ]
      },
      {
        "id": "Elicit.Slot.ConsultarMetricasPorFechaIntent.estadoContrato",
        "variations": [
          {
            "type": "PlainText",
            "value": "¿Qué estado deseas consultar? Por ejemplo: firmados, rechazados o en revisión."
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Validate it's well-formed JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('ALEXA/skill-package/interactionModels/custom/es-MX.json','utf8')); console.log('valid JSON')"
```
Expected: `valid JSON`

- [ ] **Step 3: Commit**

```bash
git add ALEXA/skill-package/interactionModels/custom/es-MX.json
git commit -m "feat(alexa): add es-MX interaction model with 6 intents and EstadoContratoType"
```

---

### Task 11: Skill manifest

**Files:**
- Create: `ALEXA/skill-package/skill.json`

**Interfaces:**
- Produces: the skill manifest pointing `apis.custom.endpoint.sourceDir` at `lambda` (Task 15) for `ask deploy`.

- [ ] **Step 1: Write the manifest**

```json
{
  "manifest": {
    "publishingInformation": {
      "locales": {
        "es-MX": {
          "name": "ALETHEIA CLM",
          "summary": "Dashboard auditivo para gestión de contratos ALETHEIA CLM",
          "description": "Consulta métricas ejecutivas de tu sistema CLM por voz: resumen del día, contratos por vencer, cuellos de botella en el flujo de revisión y métricas por estado y fecha.",
          "examplePhrases": [
            "Alexa, abre aletheia clm",
            "Alexa, pregunta a aletheia clm mi resumen del día",
            "Alexa, pregunta a aletheia clm qué contratos vencen este mes"
          ],
          "keywords": ["contratos", "clm", "aletheia", "reportes"]
        }
      },
      "isAvailableWorldwide": false,
      "testingInstructions": "Usar la cuenta de sistema sembrada en prisma/seed.ts contra el backend desplegado.",
      "category": "BUSINESS_AND_FINANCE",
      "distributionCountries": ["MX"]
    },
    "apis": {
      "custom": {
        "endpoint": {
          "sourceDir": "lambda"
        },
        "interfaces": []
      }
    },
    "manifestVersion": "1.0"
  }
}
```

- [ ] **Step 2: Validate it's well-formed JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('ALEXA/skill-package/skill.json','utf8')); console.log('valid JSON')"
```
Expected: `valid JSON`

- [ ] **Step 3: Commit**

```bash
git add ALEXA/skill-package/skill.json
git commit -m "feat(alexa): add skill manifest"
```

---

### Task 12: `lambda/dateRange.js`

**Files:**
- Create: `ALEXA/lambda/dateRange.js`
- Test: `ALEXA/lambda/dateRange.test.js`

**Interfaces:**
- Produces: `resolveDateRange(amazonDateValue: string): {isoStart, isoEnd} | null` and `describeAmazonDate(amazonDateValue: string): string` — both consumed by Task 15's `index.js`.

- [ ] **Step 1: Write the failing tests**

```javascript
// ALEXA/lambda/dateRange.test.js
const { resolveDateRange, describeAmazonDate } = require('./dateRange');

describe('resolveDateRange', () => {
  it('returns the same day for a plain date', () => {
    expect(resolveDateRange('2026-07-14')).toEqual({ isoStart: '2026-07-14', isoEnd: '2026-07-14' });
  });

  it('returns the full month range for a YYYY-MM value', () => {
    expect(resolveDateRange('2026-06')).toEqual({ isoStart: '2026-06-01', isoEnd: '2026-06-30' });
  });

  it('handles a leap-affected month correctly (February 2028)', () => {
    expect(resolveDateRange('2028-02')).toEqual({ isoStart: '2028-02-01', isoEnd: '2028-02-29' });
  });

  it('returns the full year range for a YYYY value', () => {
    expect(resolveDateRange('2026')).toEqual({ isoStart: '2026-01-01', isoEnd: '2026-12-31' });
  });

  it('returns Monday-Sunday for an ISO week value', () => {
    // La semana ISO 28 de 2026 empieza el lunes 6 de julio de 2026.
    expect(resolveDateRange('2026-W28')).toEqual({ isoStart: '2026-07-06', isoEnd: '2026-07-12' });
  });

  it('returns null for an unrecognized format', () => {
    expect(resolveDateRange('2026-SU')).toBeNull();
  });

  it('returns null when the value is missing', () => {
    expect(resolveDateRange(undefined)).toBeNull();
  });
});

describe('describeAmazonDate', () => {
  it('describes a month value in spoken Spanish', () => {
    expect(describeAmazonDate('2026-06')).toBe('junio de 2026');
  });

  it('describes a day value in spoken Spanish', () => {
    expect(describeAmazonDate('2026-07-14')).toBe('el 14 de julio de 2026');
  });

  it('describes a week value in spoken Spanish', () => {
    expect(describeAmazonDate('2026-W28')).toBe('la semana 28 de 2026');
  });

  it('falls back to the raw value for unrecognized formats', () => {
    expect(describeAmazonDate('2026-SU')).toBe('2026-SU');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ALEXA/lambda && npx jest dateRange`
Expected: FAIL — `Cannot find module './dateRange'`

- [ ] **Step 3: Write the implementation**

```javascript
// ALEXA/lambda/dateRange.js
'use strict';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISODateOnly(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isoWeekToRange(year, week) {
  // ISO 8601: la semana 1 es la que contiene el primer jueves del año.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // lunes=1 ... domingo=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { start, end };
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Convierte el valor resuelto de un slot AMAZON.DATE a un rango { isoStart, isoEnd }.
 * Soporta: día (YYYY-MM-DD), semana ISO (YYYY-Wnn), mes (YYYY-MM) y año (YYYY).
 */
function resolveDateRange(amazonDateValue) {
  if (!amazonDateValue) return null;

  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(amazonDateValue);
  if (weekMatch) {
    const year = Number(weekMatch[1]);
    const week = Number(weekMatch[2]);
    const { start, end } = isoWeekToRange(year, week);
    return { isoStart: toISODateOnly(start), isoEnd: toISODateOnly(end) };
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(amazonDateValue);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const monthIndex = Number(monthMatch[2]) - 1;
    const lastDay = lastDayOfMonth(year, monthIndex);
    return {
      isoStart: `${year}-${pad(monthIndex + 1)}-01`,
      isoEnd: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
    };
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(amazonDateValue);
  if (dayMatch) {
    return { isoStart: amazonDateValue, isoEnd: amazonDateValue };
  }

  const yearMatch = /^(\d{4})$/.exec(amazonDateValue);
  if (yearMatch) {
    return { isoStart: `${amazonDateValue}-01-01`, isoEnd: `${amazonDateValue}-12-31` };
  }

  return null;
}

function describeAmazonDate(amazonDateValue) {
  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(amazonDateValue);
  if (weekMatch) return `la semana ${weekMatch[2]} de ${weekMatch[1]}`;

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(amazonDateValue);
  if (monthMatch) return `${MESES[Number(monthMatch[2]) - 1]} de ${monthMatch[1]}`;

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(amazonDateValue);
  if (dayMatch) return `el ${dayMatch[3]} de ${MESES[Number(dayMatch[2]) - 1]} de ${dayMatch[1]}`;

  const yearMatch = /^(\d{4})$/.exec(amazonDateValue);
  if (yearMatch) return `el año ${amazonDateValue}`;

  return amazonDateValue;
}

module.exports = { resolveDateRange, describeAmazonDate };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest dateRange`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add ALEXA/lambda/dateRange.js ALEXA/lambda/dateRange.test.js
git commit -m "feat(alexa): add AMAZON.DATE range parsing and Spanish description helper"
```

---

### Task 13: `lambda/speechBuilders.js`

**Files:**
- Create: `ALEXA/lambda/speechBuilders.js`
- Test: `ALEXA/lambda/speechBuilders.test.js`

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces: `buildResumenEjecutivoSpeech({pendientes, firmados, rechazados}): string`, `buildMetricasPorFechaSpeech({status, count}, rangoFechaHablado: string): string`, `buildContratosPorExpirarSpeech({count, masUrgente}, rangoFechaHablado: string): string`, `buildBottlenecksSpeech({peor}): string` — all consumed by Task 15's `index.js`.

- [ ] **Step 1: Write the failing tests**

```javascript
// ALEXA/lambda/speechBuilders.test.js
const {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
} = require('./speechBuilders');

describe('speechBuilders', () => {
  it('builds the resumen ejecutivo speech with plural contratos', () => {
    const speech = buildResumenEjecutivoSpeech({ pendientes: 6, firmados: 1, rechazados: 1 });
    expect(speech).toBe('Hoy tienes 6 contratos por revisar, se han firmado 1 y 1 fueron rechazados.');
  });

  it('uses singular contrato when pendientes es 1', () => {
    const speech = buildResumenEjecutivoSpeech({ pendientes: 1, firmados: 0, rechazados: 0 });
    expect(speech).toContain('1 contrato por revisar');
  });

  it('builds the metricas por fecha speech with the spoken estado', () => {
    const speech = buildMetricasPorFechaSpeech({ status: 'REJECTED', count: 4 }, 'junio de 2026');
    expect(speech).toBe('En junio de 2026, se registraron 4 contratos en estado rechazado.');
  });

  it('handles zero results gracefully in metricas por fecha', () => {
    const speech = buildMetricasPorFechaSpeech({ status: 'SIGNED', count: 0 }, 'esta semana');
    expect(speech).toBe('En esta semana, se registraron 0 contratos en estado firmado.');
  });

  it('builds the contratos por expirar speech when there are results', () => {
    const speech = buildContratosPorExpirarSpeech(
      { count: 2, masUrgente: { vendorName: 'Acme S.A.' } },
      'los próximos 30 días',
    );
    expect(speech).toBe(
      'Tienes 2 contratos que expiran en los próximos 30 días. El más urgente es con el cliente Acme S.A.',
    );
  });

  it('handles zero results gracefully in contratos por expirar', () => {
    const speech = buildContratosPorExpirarSpeech({ count: 0, masUrgente: null }, 'este mes');
    expect(speech).toBe('No tienes contratos que expiren en este mes.');
  });

  it('builds the bottlenecks speech with the worst stage', () => {
    const speech = buildBottlenecksSpeech({ peor: { stageName: 'Revisión Legal', cantidadVencidos: 2 } });
    expect(speech).toBe(
      'Actualmente, la etapa de Revisión Legal concentra 2 contratos que han superado su tiempo límite de revisión.',
    );
  });

  it('handles the no-bottlenecks case', () => {
    const speech = buildBottlenecksSpeech({ peor: null });
    expect(speech).toBe(
      'No hay cuellos de botella en este momento; todos los contratos están dentro de su tiempo límite de revisión.',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest speechBuilders`
Expected: FAIL — `Cannot find module './speechBuilders'`

- [ ] **Step 3: Write the implementation**

```javascript
// ALEXA/lambda/speechBuilders.js
'use strict';

const ESTADO_HABLADO = {
  DRAFT: 'borrador',
  SUBMITTED: 'enviado',
  ADMIN_REVIEW: 'revisión del administrador',
  LAWYER_REVIEW: 'revisión del abogado',
  APPROVAL_PENDING: 'pendiente de aprobación',
  SIGNING: 'firma',
  SIGNED: 'firmado',
  REJECTED: 'rechazado',
  CANCELLED: 'cancelado',
};

function pluralizeContrato(cantidad) {
  return cantidad === 1 ? 'contrato' : 'contratos';
}

function conjugateRegistrar(cantidad) {
  return cantidad === 1 ? 'se registró' : 'se registraron';
}

function buildResumenEjecutivoSpeech({ pendientes, firmados, rechazados }) {
  return `Hoy tienes ${pendientes} ${pluralizeContrato(pendientes)} por revisar, se han firmado ${firmados} y ${rechazados} fueron rechazados.`;
}

function buildMetricasPorFechaSpeech({ status, count }, rangoFechaHablado) {
  const estadoHablado = ESTADO_HABLADO[status] || status;
  return `En ${rangoFechaHablado}, ${conjugateRegistrar(count)} ${count} ${pluralizeContrato(
    count,
  )} en estado ${estadoHablado}.`;
}

function buildContratosPorExpirarSpeech({ count, masUrgente }, rangoFechaHablado) {
  if (count === 0) {
    return `No tienes contratos que expiren en ${rangoFechaHablado}.`;
  }
  return `Tienes ${count} ${pluralizeContrato(
    count,
  )} que expiran en ${rangoFechaHablado}. El más urgente es con el cliente ${masUrgente.vendorName}.`;
}

function buildBottlenecksSpeech({ peor }) {
  if (!peor) {
    return 'No hay cuellos de botella en este momento; todos los contratos están dentro de su tiempo límite de revisión.';
  }
  const verbo = peor.cantidadVencidos === 1 ? 'ha' : 'han';
  return `Actualmente, la etapa de ${peor.stageName} concentra ${peor.cantidadVencidos} ${pluralizeContrato(
    peor.cantidadVencidos,
  )} que ${verbo} superado su tiempo límite de revisión.`;
}

module.exports = {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest speechBuilders`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add ALEXA/lambda/speechBuilders.js ALEXA/lambda/speechBuilders.test.js
git commit -m "feat(alexa): add pure Spanish speech builders with pluralization and empty-state handling"
```

---

### Task 14: `lambda/apiClient.js`

**Files:**
- Create: `ALEXA/lambda/apiClient.js`
- Test: `ALEXA/lambda/apiClient.test.js`

**Interfaces:**
- Consumes: `CLM_API_BASE_URL`, `CLM_SYSTEM_EMAIL`, `CLM_SYSTEM_PASSWORD` env vars; the backend's `POST /auth/login`, `POST /auth/refresh`, and the 4 GET endpoints from Tasks 6/9.
- Produces: `getDailySummary()`, `getBottlenecks()`, `getExpiringContracts(isoStart, isoEnd)`, `getContractsMetrics(status, isoStart, isoEnd)` — all `async`, resolving to the endpoint's `data` payload — consumed by Task 15's `index.js`. Also exports `resetSessionForTests()` for test isolation.

- [ ] **Step 1: Write the failing tests**

```javascript
// ALEXA/lambda/apiClient.test.js
const {
  getDailySummary,
  getExpiringContracts,
  resetSessionForTests,
} = require('./apiClient');

describe('apiClient', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      CLM_API_BASE_URL: 'https://api.test',
      CLM_SYSTEM_EMAIL: 'system@test.com',
      CLM_SYSTEM_PASSWORD: 'secret',
    };
    resetSessionForTests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetAllMocks();
  });

  it('logs in once and reuses the cached token for subsequent calls', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { accessToken: 'token-1', refreshToken: 'refresh-1' } }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          data: { pendientes: 1, firmados: 0, rechazados: 0, fecha: '2026-07-14' },
        }),
      });

    const result = await getDailySummary();

    expect(result.pendientes).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.test/auth/login');
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer token-1');
  });

  it('re-logs in when the backend responds 401 with a stale token', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { accessToken: 'token-1', refreshToken: 'refresh-1' } }),
      })
      .mockResolvedValueOnce({ status: 401, json: async () => ({ message: 'expirado' }) })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { accessToken: 'token-2', refreshToken: 'refresh-2' } }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { count: 0, contratos: [], masUrgente: null } }),
      });

    const result = await getExpiringContracts('2026-07-01', '2026-07-31');

    expect(result.count).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(global.fetch.mock.calls[3][1].headers.Authorization).toBe('Bearer token-2');
  });

  it('throws a descriptive error when the backend keeps failing', async () => {
    global.fetch.mockResolvedValue({ status: 500, json: async () => ({ message: 'boom' }) });

    await expect(getDailySummary()).rejects.toThrow(/status 500/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest apiClient`
Expected: FAIL — `Cannot find module './apiClient'`

- [ ] **Step 3: Write the implementation**

```javascript
// ALEXA/lambda/apiClient.js
'use strict';

const BASE_URL = process.env.CLM_API_BASE_URL;
const SYSTEM_EMAIL = process.env.CLM_SYSTEM_EMAIL;
const SYSTEM_PASSWORD = process.env.CLM_SYSTEM_PASSWORD;

// Cache en memoria del proceso Lambda — sobrevive entre invocaciones "warm".
let session = { accessToken: null, refreshToken: null, expiresAt: 0 };

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function login() {
  const { status, body } = await requestJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SYSTEM_EMAIL, password: SYSTEM_PASSWORD }),
  });

  if (status !== 200) {
    throw new Error(`No se pudo autenticar la cuenta de sistema (status ${status})`);
  }

  session = {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    // Margen de seguridad: el access token dura 15 min, lo damos por vencido a los 14.
    expiresAt: Date.now() + 14 * 60 * 1000,
  };
}

async function refresh() {
  const { status, body } = await requestJson('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  if (status !== 200) {
    throw new Error(`refresh falló (status ${status})`);
  }

  session = {
    ...session,
    accessToken: body.data.accessToken,
    expiresAt: Date.now() + 14 * 60 * 1000,
  };
}

async function ensureSession() {
  if (session.accessToken && Date.now() < session.expiresAt) return;

  if (session.refreshToken) {
    try {
      await refresh();
      return;
    } catch {
      // el refresh token también pudo expirar (7 días) — se cae a login limpio.
    }
  }

  await login();
}

async function getWithAuth(path) {
  await ensureSession();

  let { status, body } = await requestJson(path, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (status === 401) {
    // El access token cacheado podría haber sido invalidado del lado del servidor; reintenta una vez.
    await login();
    ({ status, body } = await requestJson(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }));
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Error del backend (status ${status}): ${JSON.stringify(body)}`);
  }

  return body.data;
}

function getDailySummary() {
  return getWithAuth('/reports/daily-summary');
}

function getBottlenecks() {
  return getWithAuth('/reports/bottlenecks');
}

function getExpiringContracts(isoStart, isoEnd) {
  return getWithAuth(`/contracts/expiring?startDate=${isoStart}&endDate=${isoEnd}`);
}

function getContractsMetrics(status, isoStart, isoEnd) {
  return getWithAuth(`/contracts/metrics?status=${status}&startDate=${isoStart}&endDate=${isoEnd}`);
}

function resetSessionForTests() {
  session = { accessToken: null, refreshToken: null, expiresAt: 0 };
}

module.exports = {
  getDailySummary,
  getBottlenecks,
  getExpiringContracts,
  getContractsMetrics,
  resetSessionForTests,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest apiClient`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add ALEXA/lambda/apiClient.js ALEXA/lambda/apiClient.test.js
git commit -m "feat(alexa): add token-caching backend client with 401 retry"
```

---

### Task 15: `lambda/index.js` + `package.json` + README (manual verification)

**Files:**
- Create: `ALEXA/lambda/index.js`
- Test: `ALEXA/lambda/index.test.js`
- Create: `ALEXA/lambda/package.json`
- Create: `ALEXA/README.md`

**Interfaces:**
- Consumes: `apiClient.*` (Task 14), `resolveDateRange`/`describeAmazonDate` (Task 12), `buildResumenEjecutivoSpeech`/`buildMetricasPorFechaSpeech`/`buildContratosPorExpirarSpeech`/`buildBottlenecksSpeech` (Task 13), the interaction model's intent/slot names (Task 10).
- Produces: `exports.handler` — the Lambda entry point referenced by `ALEXA/skill-package/skill.json`'s `apis.custom.endpoint` (Task 11).

- [ ] **Step 1: Write the failing tests**

```javascript
// ALEXA/lambda/index.test.js
jest.mock('./apiClient');

const apiClient = require('./apiClient');
const { handler } = require('./index');

function buildEnvelope(request) {
  return {
    version: '1.0',
    session: {
      new: true,
      sessionId: 'test-session',
      application: { applicationId: 'test-app' },
      user: { userId: 'test-user' },
    },
    context: {
      System: {
        application: { applicationId: 'test-app' },
        user: { userId: 'test-user' },
      },
    },
    request,
  };
}

function buildIntentRequest(intentName, slots = {}, dialogState = 'COMPLETED') {
  return {
    type: 'IntentRequest',
    requestId: 'test-request',
    timestamp: new Date().toISOString(),
    dialogState,
    intent: { name: intentName, confirmationStatus: 'NONE', slots },
  };
}

describe('ALETHEIA CLM Alexa skill handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('responds with the welcome speech on LaunchRequest', async () => {
    const event = buildEnvelope({
      type: 'LaunchRequest',
      requestId: 'test-request',
      timestamp: new Date().toISOString(),
    });

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Bienvenido al resumen ejecutivo de ALETHEIA');
    expect(result.response.shouldEndSession).toBe(false);
  });

  it('responds with the resumen ejecutivo speech, calling apiClient.getDailySummary', async () => {
    apiClient.getDailySummary.mockResolvedValue({ pendientes: 6, firmados: 1, rechazados: 1 });
    const event = buildEnvelope(buildIntentRequest('ResumenEjecutivoIntent'));

    const result = await handler(event, {});

    expect(apiClient.getDailySummary).toHaveBeenCalledTimes(1);
    expect(result.response.outputSpeech.ssml).toContain('Hoy tienes 6 contratos por revisar');
  });

  it('delegates the dialog when ConsultarMetricasPorFechaIntent is not yet completed', async () => {
    const event = buildEnvelope(
      buildIntentRequest('ConsultarMetricasPorFechaIntent', {}, 'IN_PROGRESS'),
    );

    const result = await handler(event, {});

    expect(result.response.directives[0].type).toBe('Dialog.Delegate');
    expect(apiClient.getContractsMetrics).not.toHaveBeenCalled();
  });

  it('calls apiClient.getContractsMetrics with the resolved status id and date range once completed', async () => {
    apiClient.getContractsMetrics.mockResolvedValue({ status: 'REJECTED', count: 4 });
    const slots = {
      estadoContrato: {
        name: 'estadoContrato',
        value: 'rechazados',
        resolutions: {
          resolutionsPerAuthority: [
            {
              status: { code: 'ER_SUCCESS_MATCH' },
              values: [{ value: { id: 'REJECTED', name: 'rechazado' } }],
            },
          ],
        },
      },
      rangoFecha: { name: 'rangoFecha', value: '2026-06' },
    };
    const event = buildEnvelope(buildIntentRequest('ConsultarMetricasPorFechaIntent', slots));

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).toHaveBeenCalledWith('REJECTED', '2026-06-01', '2026-06-30');
    expect(result.response.outputSpeech.ssml).toContain('4 contratos en estado rechazado');
  });

  it('asks the user to repeat the estado when entity resolution has no match', async () => {
    const slots = {
      estadoContrato: {
        name: 'estadoContrato',
        value: 'algo raro',
        resolutions: {
          resolutionsPerAuthority: [{ status: { code: 'ER_SUCCESS_NO_MATCH' } }],
        },
      },
      rangoFecha: { name: 'rangoFecha', value: '2026-06' },
    };
    const event = buildEnvelope(buildIntentRequest('ConsultarMetricasPorFechaIntent', slots));

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).not.toHaveBeenCalled();
    expect(result.response.outputSpeech.ssml).toContain('No reconocí ese estado');
  });

  it('responds with the contratos por expirar speech, calling apiClient.getExpiringContracts with the resolved range', async () => {
    apiClient.getExpiringContracts.mockResolvedValue({
      count: 1,
      contratos: [
        { id: 1, title: 'Renovación licencias', vendorName: 'Acme S.A.', status: 'SIGNED', expiresAt: '2026-07-20' },
      ],
      masUrgente: {
        id: 1,
        title: 'Renovación licencias',
        vendorName: 'Acme S.A.',
        status: 'SIGNED',
        expiresAt: '2026-07-20',
      },
    });
    const slots = { rangoFecha: { name: 'rangoFecha', value: '2026-07' } };
    const event = buildEnvelope(buildIntentRequest('ConsultarContratosPorExpirarIntent', slots));

    const result = await handler(event, {});

    expect(apiClient.getExpiringContracts).toHaveBeenCalledWith('2026-07-01', '2026-07-31');
    expect(result.response.outputSpeech.ssml).toContain('El más urgente es con el cliente Acme S.A.');
  });

  it('responds gracefully when there are no contratos por expirar', async () => {
    apiClient.getExpiringContracts.mockResolvedValue({ count: 0, contratos: [], masUrgente: null });
    const slots = { rangoFecha: { name: 'rangoFecha', value: '2026-07' } };
    const event = buildEnvelope(buildIntentRequest('ConsultarContratosPorExpirarIntent', slots));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('No tienes contratos que expiren en');
  });

  it('responds with the bottlenecks speech', async () => {
    apiClient.getBottlenecks.mockResolvedValue({
      etapas: [{ stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 }],
      peor: { stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 },
    });
    const event = buildEnvelope(buildIntentRequest('AlertaCuelloDeBotellaIntent'));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Revisión Legal concentra 2 contratos');
  });

  it('responds with the fallback speech when the backend call fails', async () => {
    apiClient.getBottlenecks.mockRejectedValue(new Error('backend down'));
    const event = buildEnvelope(buildIntentRequest('AlertaCuelloDeBotellaIntent'));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('no pude consultar la información');
  });

  it('ends the session on AMAZON.StopIntent', async () => {
    const event = buildEnvelope(buildIntentRequest('AMAZON.StopIntent'));

    const result = await handler(event, {});

    expect(result.response.shouldEndSession).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest index.test.js`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Write the implementation**

```javascript
// ALEXA/lambda/index.js
'use strict';

const Alexa = require('ask-sdk-core');
const apiClient = require('./apiClient');
const { resolveDateRange, describeAmazonDate } = require('./dateRange');
const {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
} = require('./speechBuilders');

const WELCOME_SPEECH =
  'Bienvenido al resumen ejecutivo de ALETHEIA. Puedo darte el reporte de contratos firmados, ' +
  'alertarte sobre cuellos de botella o listar contratos por expirar. ¿Qué métrica deseas consultar hoy?';

const HELP_SPEECH =
  'Puedes pedirme un resumen ejecutivo del día, preguntar por contratos rechazados este mes, ' +
  'o consultar qué contratos vencen pronto.';

const BACKEND_ERROR_SPEECH =
  'Lo siento, no pude consultar la información en este momento. Intenta de nuevo en unos minutos.';

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(WELCOME_SPEECH)
      .reprompt(WELCOME_SPEECH)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const ResumenEjecutivoIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ResumenEjecutivoIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const data = await apiClient.getDailySummary();
      const speech = buildResumenEjecutivoSpeech(data);
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ResumenEjecutivoIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const ConsultarMetricasPorFechaIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarMetricasPorFechaIntent'
    );
  },
  async handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      return handlerInput.responseBuilder.addDelegateDirective(currentIntent).getResponse();
    }

    const estadoSlot = currentIntent.slots.estadoContrato;
    const resolutions = estadoSlot.resolutions && estadoSlot.resolutions.resolutionsPerAuthority;
    const resolvedStatus =
      resolutions && resolutions[0] && resolutions[0].status.code === 'ER_SUCCESS_MATCH'
        ? resolutions[0].values[0].value.id
        : null;

    if (!resolvedStatus) {
      return handlerInput.responseBuilder
        .speak('No reconocí ese estado. Intenta con firmado, rechazado, o en revisión.')
        .reprompt('¿Qué estado deseas consultar? Por ejemplo: firmados, rechazados o en revisión.')
        .withShouldEndSession(false)
        .getResponse();
    }

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      return handlerInput.responseBuilder
        .speak('No entendí ese periodo. ¿Para qué fecha o rango deseas consultar esta información?')
        .reprompt('¿Para qué periodo deseas consultar esta información?')
        .withShouldEndSession(false)
        .getResponse();
    }

    try {
      const data = await apiClient.getContractsMetrics(resolvedStatus, range.isoStart, range.isoEnd);
      const speech = buildMetricasPorFechaSpeech(data, describeAmazonDate(rawDate));
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarMetricasPorFechaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const ConsultarContratosPorExpirarIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarContratosPorExpirarIntent'
    );
  },
  async handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      return handlerInput.responseBuilder.addDelegateDirective(currentIntent).getResponse();
    }

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      return handlerInput.responseBuilder
        .speak('No entendí ese periodo. ¿Para qué fecha o rango deseas consultar esta información?')
        .reprompt('¿Para qué periodo deseas consultar esta información?')
        .withShouldEndSession(false)
        .getResponse();
    }

    try {
      const data = await apiClient.getExpiringContracts(range.isoStart, range.isoEnd);
      const speech = buildContratosPorExpirarSpeech(data, describeAmazonDate(rawDate));
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarContratosPorExpirarIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const AlertaCuelloDeBotellaIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AlertaCuelloDeBotellaIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const data = await apiClient.getBottlenecks();
      const speech = buildBottlenecksSpeech(data);
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('AlertaCuelloDeBotellaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelpIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_SPEECH)
      .reprompt(HELP_SPEECH)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(`No entendí eso. ${HELP_SPEECH}`)
      .reprompt(HELP_SPEECH)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Hasta luego.').withShouldEndSession(true).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Error no manejado:', error);
    return handlerInput.responseBuilder
      .speak(BACKEND_ERROR_SPEECH)
      .reprompt(BACKEND_ERROR_SPEECH)
      .withShouldEndSession(false)
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ResumenEjecutivoIntentHandler,
    ConsultarMetricasPorFechaIntentHandler,
    ConsultarContratosPorExpirarIntentHandler,
    AlertaCuelloDeBotellaIntentHandler,
    HelpIntentHandler,
    FallbackIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest index.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Write `package.json`**

```json
{
  "name": "aletheia-clm-alexa-skill",
  "version": "1.0.0",
  "private": true,
  "description": "Lambda handler de la Alexa Skill ALETHEIA CLM",
  "main": "index.js",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "jest"
  },
  "dependencies": {
    "ask-sdk-core": "^2.14.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 6: Install and run the full lambda test suite**

```bash
cd ALEXA/lambda
npm install
npm test
```
Expected: all 4 test files (`dateRange`, `speechBuilders`, `apiClient`, `index`) PASS.

- [ ] **Step 7: Write `ALEXA/README.md`**

```markdown
# ALETHEIA CLM — Alexa Skill

Ver `ANALISIS_INTENTS.md` para el detalle de intents, slots y contratos de datos con el backend.

## Estructura

- `skill-package/skill.json` — manifest de la skill (es-MX).
- `skill-package/interactionModels/custom/es-MX.json` — modelo de interacción (intents, slots, dialog).
- `lambda/` — código del Lambda de la skill (Node.js 18+, `ask-sdk-core`).

## Variables de entorno del Lambda

| Variable | Descripción |
|---|---|
| `CLM_API_BASE_URL` | URL base del backend CLM, ej. `https://api.aletheia-clm.com` |
| `CLM_SYSTEM_EMAIL` | Correo del usuario de sistema sembrado en `prisma/seed.ts` (`alexa-system@aletheia-clm.com`) |
| `CLM_SYSTEM_PASSWORD` | Contraseña del usuario de sistema (`AlexaSystem#2026` en el seed de demo — cambiar en un entorno real) |

No commitear estos valores reales a git; configurarlos directamente en la consola de Lambda o vía `ask-cli`.

## Pruebas locales

```bash
cd lambda
npm install
npm test
```

## Despliegue con ASK CLI

```bash
cd ALEXA
ask deploy
```

Crea la skill en la consola de desarrollador de Alexa y despliega el Lambda usando `lambda` como `sourceDir` (requiere `ask configure` ya configurado con credenciales de AWS/Amazon).

## Notas de diseño

- **Invocation name:** `"aletheia clm"` en vez de `"CLM"` — Alexa exige nombres de invocación con más sustancia que un acrónimo de 3 letras; la certificación real rechazaría `"clm"` solo.
- **`HelpIntent` es un intent custom**, no `AMAZON.HelpIntent` — así lo pide la especificación original (`ANALISIS_INTENTS.md`), a costa de cobertura de NLU más limitada que el intent nativo de ayuda.
- **Autenticación:** cuenta de sistema (ver `ANALISIS_INTENTS.md` sección 6), sin account linking. El token se cachea en memoria del proceso Lambda entre invocaciones "warm" y se renueva automáticamente.
```

- [ ] **Step 8: Commit**

```bash
git add ALEXA/lambda/index.js ALEXA/lambda/index.test.js ALEXA/lambda/package.json ALEXA/README.md
git commit -m "feat(alexa): wire intent handlers to the backend client and add skill docs"
```

---

## Post-plan manual verification (end-to-end)

Once all 15 tasks are done and the backend is running with the seed applied:

1. In the Alexa Developer Console (or `ask dialog` from ASK CLI), import `ALEXA/skill-package/` and point the Lambda endpoint at a deployed instance of `ALEXA/lambda/` with the 3 env vars set to a reachable backend URL.
2. Test utterance: `"abre aletheia clm"` → expect the welcome speech.
3. Test utterance: `"dame mi resumen del día"` → expect real seeded numbers (6 pendientes, 1 firmado, 1 rechazado).
4. Test utterance: `"qué contratos vencen este mes"` → Alexa should either resolve the range directly or elicit it, then report the 2 expiring contracts.
5. Test utterance: `"reporte de cuellos de botella"` → expect "Revisión Legal" with 2 overdue contracts.
6. Test utterance: `"cuántos contratos rechazados hubo el mes pasado"` → expect Alexa to elicit missing slots if needed, then return count 2.

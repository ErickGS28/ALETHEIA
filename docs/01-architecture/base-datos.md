# Base de Datos — Esquema CLM (schema-per-service)

**Motor:** PostgreSQL 16 (un solo contenedor `clm_dev`)
**ORM:** Prisma con preview feature `multiSchema`
**Modelo:** **schema-per-service** — 4 schemas lógicos, uno por microservicio
**Archivos fuente:** un `schema.prisma` por servicio en `apps/backend/services/<servicio>/prisma/schema.prisma`

---

## Schema-per-service

Cada microservicio es **dueño exclusivo de su schema** y solo accede a sus propias tablas. No hay claves foráneas que crucen schemas: las referencias entre dominios (p.ej. `Contract.createdBy` → `userId` del schema `auth`) se guardan como `String` y la integridad se valida en el servicio dueño. Esto preserva el desacople de microservicios manteniendo una sola instancia de Postgres.

| Schema | Servicio dueño | Entidades |
|---|---|---|
| `auth` | `auth-service` | `User`, `Role`, `Privilege`, `RolePrivilege`, `UserRole`, `RefreshToken` |
| `contracts` | `contracts-service` | `Society`, `Area`, `Apoderado`, `Template`, `Contract` |
| `workflow` | `workflow-service` | `WorkflowStage`, `ContractWorkflow`, `WorkflowTransition`, `Notification`, `AuditLog` |
| `documents` | `documents-service` | `Document`, `DocumentVersion`, `Signature` |

> **Referencias cross-dominio (String, sin FK):** `Contract.createdBy`/`areaId` (→ `auth`/mismo schema), `WorkflowTransition.performedBy`, `Notification.userId`/`contractId`, `AuditLog.userId`/`contractId`, `Document.contractId`, `DocumentVersion.uploadedBy`, `Signature.contractId`/`apoderadoId`/`signedBy`. Dentro de un mismo schema sí se usan relaciones Prisma normales (p.ej. `Document` ↔ `DocumentVersion`).

Cada `schema.prisma` declara su schema y el cliente apunta a Postgres con `?schema=<nombre>` en la `DATABASE_URL`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["auth"]   // contracts | workflow | documents según el servicio
}

// model User { ... @@schema("auth") }
```

---

## Entidades y Relaciones (modelo de dominio completo)

El modelo de negocio es el mismo; abajo se muestra como un solo diagrama lógico. Las flechas que cruzan el borde de un schema representan referencias por `String` (no FK física).

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
┌─ schema auth (auth-service) ──────────────────────────────┐
│  User ──▶ UserRole ◀── Role ──▶ RolePrivilege ──▶ Privilege│
│  User ──▶ RefreshToken                                     │
└───────────────────────────────────────────────────────────┘
        ▲ userId/areaId (String, sin FK cross-schema)
        │
┌─ schema contracts (contracts-service) ────────────────────┐
│  Society ──▶ Template                                      │
│  Society ──▶ Contract ◀── Area                             │
│  Apoderado                                                 │
└───────────────────────────────────────────────────────────┘
        ▲ contractId/apoderadoId (String)
        │
┌─ schema workflow (workflow-service) ──────────────────────┐
│  WorkflowStage ──▶ ContractWorkflow ──▶ WorkflowTransition │
│  Notification        AuditLog       (refieren contractId)  │
└───────────────────────────────────────────────────────────┘
        │
┌─ schema documents (documents-service) ────────────────────┐
│  Document ──▶ DocumentVersion                              │
│  Signature        (refieren contractId/apoderadoId/userId) │
└───────────────────────────────────────────────────────────┘

──▶  dentro del schema: relación Prisma con FK real
▲    entre schemas: referencia por String (sin FK), validada en el servicio dueño
```

---

## Schema Prisma (por servicio)

Cada bloque corresponde al `schema.prisma` de su servicio. Las relaciones se mantienen **solo dentro del mismo schema**; las referencias a entidades de otro servicio son `String` anotados con `// → schema.Entidad`.

### `auth-service` — schema `auth`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")   // ...?schema=auth
  schemas  = ["auth"]
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String
  name          String
  areaId        String?        // → contracts.Area (String, sin FK cross-schema)
  isActive      Boolean        @default(true)
  userRoles     UserRole[]
  refreshTokens RefreshToken[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@schema("auth")
}

model Role {
  id             String          @id @default(uuid())
  name           String          @unique
  // SOLICITANTE | ADMINISTRADOR | ABOGADO | APROBADOR | FIRMANTE
  rolePrivileges RolePrivilege[]
  userRoles      UserRole[]

  @@schema("auth")
}

model Privilege {
  id             String          @id @default(uuid())
  code           String          @unique
  // CONTRACT_CREATE | CONTRACT_REVIEW_ADMIN | ...
  description    String
  rolePrivileges RolePrivilege[]

  @@schema("auth")
}

model RolePrivilege {
  roleId      String
  privilegeId String
  role        Role      @relation(fields: [roleId], references: [id])
  privilege   Privilege @relation(fields: [privilegeId], references: [id])

  @@id([roleId, privilegeId])
  @@schema("auth")
}

model UserRole {
  userId String
  roleId String
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
  @@schema("auth")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@schema("auth")
}
```

### `contracts-service` — schema `contracts`

```prisma
// datasource db { ... schemas = ["contracts"] }   generator: previewFeatures = ["multiSchema"]

model Society {
  id        String     @id @default(uuid())
  name      String     @unique
  isActive  Boolean    @default(true)
  contracts Contract[]
  templates Template[]

  @@schema("contracts")
}

model Area {
  id        String     @id @default(uuid())
  name      String     @unique
  isActive  Boolean    @default(true)
  contracts Contract[]
  // los usuarios viven en schema auth; Area no referencia User aquí

  @@schema("contracts")
}

model Apoderado {
  id         String   @id @default(uuid())
  name       String
  legalPower String
  isActive   Boolean  @default(true)
  // las firmas viven en schema documents; se referencian por apoderadoId String

  @@schema("contracts")
}

model Template {
  id        String   @id @default(uuid())
  name      String
  content   String   // HTML del editor WYSIWYG
  societyId String?
  society   Society? @relation(fields: [societyId], references: [id])
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@schema("contracts")
}

model Contract {
  id           String         @id @default(uuid())
  folio        String         @unique
  title        String
  societyId    String
  society      Society        @relation(fields: [societyId], references: [id])
  vendorName   String
  vendorEmail  String
  vendorType   VendorType
  areaId       String
  area         Area           @relation(fields: [areaId], references: [id])
  status       ContractStatus @default(DRAFT)
  createdBy    String         // → auth.User (userId del solicitante)
  cancelledAt  DateTime?
  cancelReason String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  // workflow, documents, signatures, auditLogs y notifications viven en OTROS schemas
  // y se referencian por contractId String desde sus servicios dueños

  @@schema("contracts")
}

enum VendorType {
  PERSONA_FISICA
  PERSONA_MORAL

  @@schema("contracts")
}

enum ContractStatus {
  DRAFT
  SUBMITTED
  ADMIN_REVIEW
  LAWYER_REVIEW
  APPROVAL_PENDING
  APPROVED
  SIGNING
  SIGNED
  CANCELLED
  REJECTED

  @@schema("contracts")
}
```

### `workflow-service` — schema `workflow`

```prisma
// datasource db { ... schemas = ["workflow"] }

model WorkflowStage {
  id                String             @id @default(uuid())
  name              String
  order             Int
  assignedRole      String             // nombre del rol asignado a esta etapa
  slaHours          Int
  isEditable        Boolean            @default(true)
  contractWorkflows ContractWorkflow[]

  @@schema("workflow")
}

model ContractWorkflow {
  id             String               @id @default(uuid())
  contractId     String               @unique  // → contracts.Contract
  currentStageId String
  currentStage   WorkflowStage        @relation(fields: [currentStageId], references: [id])
  enteredAt      DateTime             @default(now())
  transitions    WorkflowTransition[]

  @@schema("workflow")
}

model WorkflowTransition {
  id                 String           @id @default(uuid())
  contractWorkflowId String
  contractWorkflow   ContractWorkflow @relation(fields: [contractWorkflowId], references: [id])
  fromStageId        String
  toStageId          String
  action             TransitionAction
  comment            String?
  performedBy        String           // → auth.User (userId)
  performedAt        DateTime         @default(now())

  @@schema("workflow")
}

enum TransitionAction {
  APPROVE
  REJECT
  RETURN

  @@schema("workflow")
}

model Notification {
  id         String   @id @default(uuid())
  userId     String   // → auth.User
  title      String
  message    String
  isRead     Boolean  @default(false)
  contractId String?  // → contracts.Contract
  createdAt  DateTime @default(now())

  @@schema("workflow")
}

model AuditLog {
  id         String   @id @default(uuid())
  contractId String   // → contracts.Contract
  userId     String   // → auth.User
  action     String   // ej: "SUBMITTED", "APPROVED", "DOCUMENT_UPLOADED"
  oldValue   Json?
  newValue   Json?
  createdAt  DateTime @default(now())

  @@schema("workflow")
}
```

> `AuditLog` se modela en el schema `workflow` (el servicio que orquesta las transiciones es quien centraliza la bitácora). Otros servicios que registran auditoría lo hacen emitiendo el evento correspondiente; el detalle de implementación queda a criterio del equipo siempre que no se creen FK cross-schema.

### `documents-service` — schema `documents`

```prisma
// datasource db { ... schemas = ["documents"] }

model Document {
  id             String            @id @default(uuid())
  contractId     String            // → contracts.Contract
  name           String
  type           String
  isRequired     Boolean
  expiresAt      DateTime?
  currentVersion Int               @default(1)
  versions       DocumentVersion[]
  createdAt      DateTime          @default(now())

  @@schema("documents")
}

model DocumentVersion {
  id         String   @id @default(uuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  version    Int
  filePath   String
  fileSize   Int
  mimeType   String
  uploadedBy String   // → auth.User (userId)
  createdAt  DateTime @default(now())

  @@schema("documents")
}

model Signature {
  id            String   @id @default(uuid())
  contractId    String   // → contracts.Contract
  apoderadoId   String?  // → contracts.Apoderado
  signatureData String   // base64 del canvas
  signedBy      String   // → auth.User (userId del firmante)
  signedAt      DateTime @default(now())

  @@schema("documents")
}
```

---

## Resumen de Entidades

| Entidad | Schema / Servicio | Propósito |
|---|---|---|
| `User` | `auth` | Usuarios del sistema con área asignada (`areaId` String) |
| `Role` | `auth` | Roles: Solicitante, Administrador, Abogado, Aprobador, Firmante |
| `Privilege` | `auth` | Permisos granulares asignados a roles |
| `RolePrivilege` | `auth` | Relación N:M entre Role y Privilege |
| `UserRole` | `auth` | Relación N:M entre User y Role |
| `RefreshToken` | `auth` | Tokens de refresco para invalidación en logout |
| `Society` | `contracts` | Empresas/razones sociales disponibles para contratos |
| `Area` | `contracts` | Áreas organizacionales (Compras, Legal, RRHH…) |
| `Apoderado` | `contracts` | Firmantes legales con poder notarial |
| `Template` | `contracts` | Plantillas WYSIWYG de contratos, opcionalmente por sociedad |
| `Contract` | `contracts` | Contrato principal con estado y metadata del proveedor |
| `WorkflowStage` | `workflow` | Etapas configurables del flujo (configuradas por Administrador) |
| `ContractWorkflow` | `workflow` | Estado actual del flujo de un contrato (`contractId` String) |
| `WorkflowTransition` | `workflow` | Historial de cada acción tomada sobre el flujo |
| `Notification` | `workflow` | Notificaciones internas por usuario (`userId` String) |
| `AuditLog` | `workflow` | Bitácora de acciones sobre un contrato (`contractId`/`userId` String) |
| `Document` | `documents` | Documento requerido para un contrato (`contractId` String) |
| `DocumentVersion` | `documents` | Versiones de un documento (historial de subidas) |
| `Signature` | `documents` | Firma registrada (canvas base64), `apoderadoId`/`signedBy` String |

---

## Notas de Diseño

- **RefreshToken en BD**: necesario para poder invalidar el token en logout. Sin esta tabla, un usuario que cierra sesión seguiría teniendo un refresh token válido por 7 días.
- **vendorName en Contract**: se agrega para guardar el nombre del proveedor además de su correo, ya que no es un usuario del sistema.
- **title en Contract**: campo descriptivo para identificar el contrato en listas y reportes.
- **isActive en Society/Area**: permite desactivar sin eliminar, manteniendo la integridad referencial con contratos históricos.
- Los campos `performedBy`, `createdBy`, `uploadedBy`, `signedBy`, `userId` almacenan el `userId` como String (no FK directa) para mantener el registro histórico incluso si el usuario es desactivado **y** porque el usuario vive en otro schema (`auth`): no se permiten FK cross-schema.
- **Schema-per-service:** toda referencia que cruce el borde de un schema (p.ej. `Document.contractId`, `Notification.userId`, `Signature.apoderadoId`) es un `String` sin FK física. La existencia se valida en el servicio dueño antes de persistir. Dentro de un mismo schema sí se usan relaciones Prisma con integridad referencial (p.ej. `Document` ↔ `DocumentVersion`, `Contract` ↔ `Society`).

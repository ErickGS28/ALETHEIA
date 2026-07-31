# Flujo de Desarrollo — Backend CLM (Microservicios)

**Stack:** API Gateway + 4 microservicios NestJS · Redis pub/sub (`@nestjs/microservices`, `Transport.REDIS`) · PostgreSQL 16 (schema-per-service) · Prisma ORM
**Criterio de orden:** del componente más independiente al más dependiente, según el flujo de negocio y las dependencias entre servicios (referencias cross-dominio como `String`, sin FK cross-schema).

---

## Mapa de Dependencias

```
[Infra: docker compose postgres + redis]
       │
       ▼
[backend/commons]  (contracts/DTOs+eventos · observability · security/JWT · utils)
       │
       ▼
[gateway]  ←── necesita JWT guard + ClientProxy hacia los servicios
       │
       ▼
[auth-service]  (schema auth)  ←── login/JWT que protege a todo lo demás
       │
       ▼
[contracts-service]  (schema contracts)  ←── catálogos + Contract (entidad central)
       │
       ├───────────────────────────────┐
       ▼                               ▼
[workflow-service]               [documents-service]
 (schema workflow)                (schema documents)
 state machine + SLA              factory documentos + versionado
 + notifications (Observer)       + signatures (Strategy)
       │
       ▼
[microfrontends]  web-shell (host) → solicitudes-mf, flujo-mf, … (consumen gateway vía RTK Query)
```

> Cada servicio es dueño de su schema. La comunicación es REST hacia el gateway y mensajes/eventos Redis del gateway hacia los servicios; los servicios **no se llaman entre sí directamente** (Observer interno en `workflow-service`).

---

## Fase 0 — Infraestructura Base

> Sin esto nada puede ejecutarse. No hay lógica de negocio aquí, solo la plataforma y los cimientos compartidos.

| # | Qué hacer | Por qué primero |
|---|---|---|
| 0.1 | Monorepo aplanado a la raíz: `pnpm-workspace.yaml` + `turbo.json` + `biome.json` + Husky + Commitlint | Base de todo el proyecto. `.husky/` junto a `.git` (raíz = monorepo) para que el hook `prepare` no falle. |
| 0.2 | `infra/docker/compose/docker-compose.dev.yml` con **PostgreSQL 16 + Redis 7** | Postgres para los schemas; Redis es el transporte entre gateway y servicios. Ambos deben correr antes de cualquier migración o mensaje. |
| 0.3 | `apps/backend/commons` configurado | Librería compartida (contratos de eventos/DTOs, JWT, logger, utils) que importan el gateway y todos los servicios. Crearla primero evita mover código después. |
| 0.4 | `packages/shared-schemas` configurado | Tipos compartidos front ↔ back, antes de que cualquier app empiece a exportar tipos. |

**Entregable de fase:** `pnpm install` sin el error `prepare: .git can't be found`; `pnpm infra:up` deja postgres + redis arriba.

---

## Fase 1 — Gateway + auth-service

> El gateway es el único punto HTTP y todo el sistema está protegido por JWT + `PrivilegeGuard`. `auth-service` emite el JWT. Sin estos dos, ningún otro endpoint puede validarse. Se construyen juntos porque el gateway necesita un servicio detrás para probar el routing Redis.

| # | Componente | Detalle |
|---|---|---|
| 1.1 | `gateway` bootstrap HTTP | `main.ts` + Swagger (`/api/docs`) + `GlobalExceptionFilter`. `JwtAuthGuard`, `PrivilegeGuard`, decoradores `@RequirePrivilege`/`@CurrentUser`. `ClientProxy` (Redis) hacia los servicios. Swagger y el filtro global se registran una sola vez aquí. |
| 1.2 | `auth-service` bootstrap microservicio | `main.ts` arranca como microservicio Redis. `prisma/schema.prisma` con schema `auth`, `PrismaService`, primera migración del schema auth. |
| 1.3 | `auth-service`: auth | Login, refresh, logout (`@MessagePattern`). `JwtStrategy`. Emite `{ accessToken, refreshToken, privileges[] }`. |
| 1.4 | `auth-service`: users | CRUD de usuarios, asignación de roles. Privilegio `USERS_MANAGE`. |
| 1.5 | Seed de roles/privilegios | 5 filas en `Role`, 19 en `Privilege`, y `RolePrivilege` (ver tabla en `implementacion.md` §7). Debe correr antes de proteger endpoints con `@RequirePrivilege`. |

**Entregable de fase:** `POST /auth/login` (gateway → auth-service por Redis) devuelve tokens + privilegios; Swagger responde en `/api/docs`. Los endpoints posteriores ya pueden protegerse en el gateway.

---

## Fase 2 — contracts-service (catálogos + contratos)

> `contracts-service` es dueño del schema `contracts`: catálogos base (`Area`, `Society`, `Apoderado`, `Template`) y la entidad central `Contract`. Los catálogos van primero porque `Contract` y `Template` los referencian; las referencias a `userId` se guardan como `String` (cross-dominio hacia auth).

| # | Componente | Detalle |
|---|---|---|
| 2.1 | `contracts-service` bootstrap | Microservicio Redis + `prisma/schema.prisma` (schema `contracts`) + migración. |
| 2.2 | Catálogos: `areas`, `societies`, `apoderados` | `GET/POST/PATCH` expuestos por el gateway. Seed con al menos un `Area` y un `Society`. |
| 2.3 | `templates` | Depende de `Society` (FK opcional). `TEMPLATES_MANAGE`. Contenido HTML del editor WYSIWYG. |
| 2.4 | `contracts` + `IContractRepository` (Repository) | CRUD, folio auto-generado, `AuditLog` como side-effect en cada mutación. Estados base `DRAFT → SUBMITTED` (las transiciones siguientes las maneja workflow-service). `createdBy`/`areaId` como referencias. |

**Entregable de fase:** CRUD de catálogos y de contratos vía gateway: `POST /contracts`, `GET /contracts`, `GET /contracts/:id`, `PATCH /contracts/:id`, `POST /contracts/:id/submit|cancel|recover`.

---

## Fase 3 — workflow-service (state machine + SLA + notifications)

> Dueño del schema `workflow`. Implementa el motor de transiciones, el SLA y, dentro del mismo servicio, el módulo de notificaciones que consume los eventos de cambio de estado (patrón Observer). Es el corazón del flujo de revisión.

| # | Componente | Detalle |
|---|---|---|
| 3.1 | `workflow-service` bootstrap | Microservicio Redis + `prisma/schema.prisma` (schema `workflow`) + migración. |
| 3.2 | `WorkflowStage` CRUD | Config de etapas por el Administrador (`WORKFLOW_CONFIG`). Open/Closed: etapas en BD. |
| 3.3 | `ContractStateMachine` (State Machine) | Valida que cada acción sea válida en el estado actual; elimina estados inválidos. |
| 3.4 | `ContractWorkflow` + `WorkflowTransition` | Crea el workflow al primer `SUBMITTED`; registra cada transición con `performedBy` y `comment`. |
| 3.5 | Cálculo SLA | `horasTranscurridas = now() - contractWorkflow.enteredAt` → semáforo en `GET /workflow/:contractId`. |
| 3.6 | Notifications (Observer) | `WorkflowService` **emite un evento** de cambio de estado; el módulo Notifications lo consume y crea el registro en `Notification`. Endpoints `GET /notifications`, `PATCH /notifications/:id/read`. |

**Endpoints (vía gateway):** `GET /workflow/:contractId`, `POST /workflow/:contractId/approve|reject|return`, `GET/POST/PATCH /workflow/stages`, `/notifications`.

**Entregable de fase:** flujo `SUBMITTED → ADMIN_REVIEW → LAWYER_REVIEW → APPROVAL_PENDING → APPROVED` con notificaciones y semáforo SLA.

---

## Fase 4 — documents-service (documentos + firmas)

> Dueño del schema `documents`. Gestiona la carga/versionado de documentos (Factory por tipo de proveedor) y las firmas (Strategy). Requiere que `Contract` exista (referencia por `contractId` String) y, para firmar, que esté en estado `SIGNING`.

| # | Componente | Detalle |
|---|---|---|
| 4.1 | `documents-service` bootstrap | Microservicio Redis + `prisma/schema.prisma` (schema `documents`) + migración. |
| 4.2 | `DocumentRequirementFactory` (Factory) | Lista de documentos requeridos según `VendorType` (Física vs Moral). Principio O. |
| 4.3 | Upload multipart + versionado | `POST /documents/:contractId` (`DOCUMENT_UPLOAD`), `GET/POST /documents/:id/versions` (`DOCUMENT_VERSION`). |
| 4.4 | `ISignatureStrategy` + `CanvasSignatureStrategy` (Strategy) | Valida `SIGNING`, crea `Signature` (canvas base64), avanza a `SIGNED`. `ElectronicSignatureStrategy` queda como placeholder con la interfaz lista. `CONTRACT_SIGN`. |

**Endpoints (vía gateway):** `POST/GET /documents/:contractId`, `GET/POST /documents/:id/versions`, `POST/GET /signatures/:contractId`.

**Entregable de fase:** documentos versionados; firma registrada → contrato `SIGNED` → AuditLog actualizado.

---

## Fase 5 — Microfrontends

> Una vez el gateway expone el API, se construyen el host y los MFs. Se scaffoldean los 7 MFs y se implementan a fondo `solicitudes-mf` + `flujo-mf` (el módulo funcional de referencia).

| # | Componente | Detalle |
|---|---|---|
| 5.1 | `commons` frontend | `ui` (Neobrutalism/shadcn + Tailwind v4), `hooks`, `state` (Redux), `api` (RTK Query con token JWT), `utils`. |
| 5.2 | `web-shell` (App Shell) | Host Multi-Zones: login, layout global, estado de auth/privilegios (Redux), `rewrites` por `basePath` hacia cada MF. |
| 5.3 | `solicitudes-mf` | `create-contract`, `contract-list`, `contract-detail`. Consume `contracts-service` vía gateway. `<PrivilegeGuard>` por privilegio. |
| 5.4 | `flujo-mf` | `review-panel`, `workflow-timeline`, `sla-dashboard`. Consume `workflow-service` vía gateway. |
| 5.5 | Scaffolding del resto | `contratos`, `documentos`, `firmas`, `reportes`, `admin`: app Next mínima que arranca, lista para crecer. |

**Entregable de fase:** `pnpm dev:core` levanta gateway + auth/contracts/workflow + web-shell + solicitudes-mf + flujo-mf; el ciclo solicitud → revisión con bitácora, notificación y SLA es demostrable de punta a punta.

---

## Resumen — Orden de Construcción

| Fase | Componente(s) | Dependencias de entrada | Sprint |
|---|---|---|---|
| 0 | Infra (compose postgres+redis), monorepo, `backend/commons`, `shared-schemas` | Ninguna | Sprint 1 |
| 1 | `gateway` + `auth-service` (auth, users, seed roles/privilegios) | Fase 0 | Sprint 1 |
| 2 | `contracts-service` (catálogos + contracts) | auth (guards) | Sprint 2 |
| 3 | `workflow-service` (state machine + SLA + notifications) | contracts | Sprint 2–3 |
| 4 | `documents-service` (documentos + firmas) | contracts (SIGNING) | Sprint 3 |
| 5 | `web-shell` + `solicitudes-mf` + `flujo-mf` (+ scaffolding 5 MFs) | gateway con API | Sprint 3–4 |

---

## Reglas de Transición entre Fases

1. **No avanzar de fase hasta que los endpoints de la fase actual pasen pruebas manuales en Swagger** del gateway (`/api/docs`).
2. **El schema de cada servicio se define completo al construir ese servicio.** Agregar columnas después fuerza regenerar el cliente Prisma de ese servicio.
3. **El seed de roles/privilegios es parte de Fase 1** y debe correr antes de proteger cualquier endpoint con `@RequirePrivilege`.
4. **`AuditLog` no es un servicio separado** — es un side-effect que cada servicio dueño inserta en sus mutaciones (no requiere su propio controlador HTTP).
5. **El Observer de Notifications vive dentro de `workflow-service`**: el módulo Notifications debe estar listo antes de que `WorkflowService` emita eventos de cambio de estado.
6. **Referencias cross-dominio como `String`**: nunca FK entre schemas; la validación de existencia la hace el servicio dueño.

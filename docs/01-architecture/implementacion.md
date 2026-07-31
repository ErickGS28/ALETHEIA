# Implementación de Referencia — Gestor de Contratos CLM

## 1. Visión del Sistema

El sistema **CLM (Contract Lifecycle Management)** gestiona el ciclo de vida contractual: desde la solicitud del Solicitante, pasando por la revisión del Administrador y el Abogado, la aprobación formal del Aprobador, hasta la firma simulada del Firmante/Apoderado.

---

## 2. Arquitectura General

### SOFEA + Microservicios (NestJS) + Microfrontends

El backend es un conjunto de **microservicios NestJS** detrás de un **API Gateway**. El gateway es el único punto HTTP REST: valida JWT, aplica los guards de privilegio y enruta cada petición al microservicio dueño del dominio mediante **Redis pub/sub**. Cada microservicio es dueño exclusivo de su **schema de base de datos** (schema-per-service). Los servicios externos futuros (Alexa, etc.) se conectarán al mismo API REST del gateway.

```
[ Navegador ]
      │  REST + JSON (Authorization: Bearer)
      ▼
[ web-shell — Next.js host (Multi-Zones) ]  ← compone los microfrontends
      │  REST + JSON
      ▼
┌──────────────────────────────────────────────────────────┐
│  API Gateway (NestJS HTTP)                                │
│  JWT guard · PrivilegeGuard · Swagger /api/docs · routing │
└──────────────────────────────────────────────────────────┘
      │  Redis pub/sub  (@nestjs/microservices · Transport.REDIS)
      ├──────────────┬──────────────┬───────────────┐
      ▼              ▼              ▼               ▼
[auth-service] [contracts-service] [workflow-service] [documents-service]
  schema auth    schema contracts    schema workflow     schema documents
      │              │                  │ (emite eventos     │
      │              │                  │  de cambio de      │
      │              │                  │  estado · Observer)│
      └──────────────┴──────────────────┴───────────────────┘
      │
      ▼
[ PostgreSQL ]  ← 1 contenedor, schemas: auth · contracts · workflow · documents
[ Redis ]       ← transporte de mensajería entre gateway y servicios

      ▲
      │ (futuro)
[ Alexa ]  [ Servicio externo 2 ]
```

**SOFEA:** El frontend es una SPA compuesta de microfrontends independientes. El backend expone solo REST + JSON a través del gateway — nunca renderiza HTML. Ambas capas escalan de forma independiente.

**Microservicios:** El gateway no tiene lógica de negocio ni base de datos; solo enruta. Cada microservicio es autónomo, dueño de su schema y desplegable por separado. La comunicación es **REST hacia el gateway** y **eventos/mensajes Redis** entre gateway y servicios. No hay llamadas directas entre microservicios ni FKs cruzadas entre schemas: las referencias cross-dominio se guardan como `String` (p.ej. `Contract.createdBy` = `userId`).

### Preguntas guía del curso — Microservicios

- **¿Qué servicios existen y qué hace cada uno?** `auth-service`, `contracts-service`, `workflow-service`, `documents-service` (ver §2.1) más el `gateway`.
- **¿Cómo se comunican?** Cliente → gateway por **REST**; gateway → servicios por **Redis pub/sub** (request-response con `ClientProxy.send()` y eventos con `emit()`).
- **¿Qué schemas/tablas usa cada servicio?** Cada servicio es dueño de un schema Prisma (`auth`, `contracts`, `workflow`, `documents`); el mapeo entidad→schema está en [`base-datos.md`](./base-datos.md).
- **¿Cómo se protegen los endpoints?** JWT validado en el gateway + `PrivilegeGuard` por privilegio requerido (Decorator `@RequirePrivilege`). Los microservicios confían en el contexto de usuario que el gateway propaga.
- **¿Cómo se manejan los fallos entre servicios?** `GlobalExceptionFilter` en el gateway normaliza la respuesta; timeouts/caídas de transporte Redis → `503/504` uniforme. Circuit Breaker queda como mejora avanzada futura.

### 2.1 Microservicios y responsabilidades

| Servicio | Responsabilidad | Schema | Patrones/privilegios clave |
|---|---|---|---|
| `gateway` | Único punto HTTP REST. Valida JWT, aplica `PrivilegeGuard`, expone Swagger, enruta a los servicios vía Redis. Sin lógica de negocio ni BD. | — | Decorator `@RequirePrivilege`, `GlobalExceptionFilter` |
| `auth-service` | Login/refresh/logout, usuarios, roles, privilegios, `RefreshToken`. Emite y valida JWT. | `auth` | `USERS_MANAGE` |
| `contracts-service` | Contratos (CRUD, folio, estados base) + catálogos (`areas`, `societies`, `apoderados`, `templates`). | `contracts` | Repository · `CONTRACT_*`, `AREAS/TEMPLATES/APODERADOS_MANAGE` |
| `workflow-service` | State Machine de transiciones + SLA (`ContractWorkflow`/`WorkflowTransition`/`WorkflowStage`) + Notifications (Observer). | `workflow` | State Machine, Observer · `CONTRACT_REVIEW_*`, `WORKFLOW_CONFIG` |
| `documents-service` | Documentos (upload, versionado, Factory por tipo de proveedor) + Firmas (Strategy canvas). | `documents` | Factory, Strategy · `DOCUMENT_*`, `CONTRACT_SIGN` |

> `commons` es una librería compartida del backend (no un servicio): `contracts` (DTOs/eventos), `observability` (logger), `security` (JWT) y `utils`.

---

## 3. Estructura del Monorepo

El monorepo está **aplanado a la raíz git**: `ALETHEIA/` es a la vez la raíz del repositorio y la raíz del workspace de Turborepo + pnpm. Ya **no existe** la carpeta anidada `clm-system/`.

```
ALETHEIA/                              # raíz git = raíz monorepo
├─ README.md
├─ .gitignore / .editorconfig / .nvmrc / .npmrc
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ biome.json
├─ commitlint.config.cjs
├─ .husky/ (pre-commit, commit-msg)   # junto a .git → husky encuentra el repo
│
├─ docs/
│   ├─ 00-overview/    (consideraciones-generales, vision, glossary, principles)
│   ├─ 01-architecture/
│   │   ├─ c4/         (context, container, component, deployment)
│   │   ├─ decisions/  (ADR-0001 … ADR-0008)
│   │   ├─ standards/  (api-guidelines, security-baseline, branching)
│   │   ├─ implementacion.md · flujo-desarrollo.md · base-datos.md
│   ├─ 02-api/         (openapi/, postman/)
│   ├─ 03-runbooks/    (ejecutar-proyecto.md)
│   ├─ 04-product/     (historias-de-usuario)
│   ├─ changelog/
│   └─ superpowers/specs/
│
├─ infra/docker/compose/
│   └─ docker-compose.dev.yml         # postgres + redis
│
├─ scripts/                           # dev, bootstrap, lint, test
│
├─ packages/
│   └─ shared-schemas/                # Tipos TypeScript frontend ↔ backend
│
└─ apps/
    ├─ frontend/
    │   ├─ web-shell/                  # Next.js host (Multi-Zones): login, layout, auth global
    │   ├─ microfrontends/
    │   │   ├─ solicitudes-mf/         # Crear y gestionar solicitudes
    │   │   ├─ contratos-mf/           # Editor WYSIWYG + plantillas
    │   │   ├─ documentos-mf/          # Carga, versionado, vigencia
    │   │   ├─ flujo-mf/               # Revisión, aprobación, semáforo SLA
    │   │   ├─ firmas-mf/              # Canvas de firma simulada
    │   │   ├─ reportes-mf/            # Historial, bitácora, reportes
    │   │   └─ admin-mf/               # Config: flujos, usuarios, áreas
    │   └─ commons/
    │       ├─ ui/      # Neobrutalism / shadcn + Tailwind v4
    │       ├─ hooks/
    │       ├─ state/   # Redux Toolkit
    │       ├─ api/     # RTK Query (fetchBaseQuery + token JWT)
    │       └─ utils/
    │
    └─ backend/
        ├─ gateway/                    # NestJS HTTP REST + Swagger + JWT guard → enruta
        ├─ services/
        │   ├─ auth-service/           # auth + users + roles/privilegios
        │   ├─ contracts-service/      # contracts + catálogos (areas, societies, apoderados, templates)
        │   ├─ workflow-service/       # workflow (state machine + SLA) + notifications (observer)
        │   └─ documents-service/      # documents (versionado, factory) + signatures (strategy)
        └─ commons/                    # contracts (DTOs/eventos) · observability · security (JWT) · utils
```

---

## 4. Estructura Interna del Backend

Cada microservicio es una app NestJS independiente con la **misma estructura interna por dominio**. Esto garantiza coherencia y aplica el principio **S de SOLID**. El `gateway` expone HTTP; los `services/*` arrancan como **microservicios Redis** (`Transport.REDIS`) y solo escuchan mensajes/eventos.

```
backend/
├─ gateway/                            # HTTP REST — sin lógica de negocio ni BD
│   └─ src/
│       ├─ main.ts                     # bootstrap HTTP + Swagger + GlobalExceptionFilter
│       ├─ auth/
│       │   ├─ guards/ (jwt-auth.guard, privilege.guard)
│       │   └─ decorators/ (require-privilege, current-user)
│       └─ routes/                     # controllers que reenvían al servicio vía ClientProxy
│           ├─ contracts.controller.ts
│           ├─ workflow.controller.ts
│           ├─ documents.controller.ts
│           └─ ...
│
├─ services/
│   ├─ auth-service/                   # schema "auth"
│   │   └─ src/
│   │       ├─ main.ts                 # bootstrap microservicio Redis
│   │       ├─ prisma/                 # schema.prisma (schema=auth) + PrismaService
│   │       ├─ auth/  (controller @MessagePattern / service / strategies/jwt.strategy.ts)
│   │       └─ users/ (controller / service / dto)
│   │
│   ├─ contracts-service/              # schema "contracts"
│   │   └─ src/
│   │       ├─ prisma/                 # schema.prisma (schema=contracts)
│   │       ├─ contracts/ (controller / service / contracts.repository.ts / dto)  # Repository
│   │       └─ catalogs/  (areas / societies / apoderados / templates)
│   │
│   ├─ workflow-service/               # schema "workflow"
│   │   └─ src/
│   │       ├─ prisma/                 # schema.prisma (schema=workflow)
│   │       ├─ workflow/
│   │       │   ├─ state-machine/contract-state-machine.ts   # Patrón State Machine
│   │       │   └─ controller / service / repository / dto
│   │       └─ notifications/ (service / controller)         # Patrón Observer
│   │
│   └─ documents-service/              # schema "documents"
│       └─ src/
│           ├─ prisma/                 # schema.prisma (schema=documents)
│           ├─ documents/
│           │   ├─ factories/document-requirement.factory.ts # Patrón Factory
│           │   └─ controller / service / repository / dto
│           └─ signatures/
│               └─ strategies/ (canvas.strategy, electronic.strategy) # Patrón Strategy
│
└─ commons/                            # librería compartida (no es un servicio)
    ├─ contracts/      # DTOs y contratos de eventos compartidos (message patterns)
    ├─ observability/  # logger
    ├─ security/       # utilidades JWT
    └─ utils/
```

> **Reportes:** el gateway expone los endpoints `/reports/*`; la lectura agregada la resuelven los servicios dueños de cada dominio (no hay un `reports-service` separado en esta fase).

---

## 5. Microfrontends (Next.js Multi-Zones)

La separación en microfrontends responde a dominios funcionales del negocio, **no a roles de usuario**. Cada microfrontend es una **app Next.js independiente** con su propio `basePath` (p.ej. `/solicitudes`) y puede ser utilizado por distintos roles; la diferenciación de lo que cada rol puede ver o ejecutar se gestiona dentro del propio microfrontend mediante guardias de privilegio. El estado global de autenticación y privilegios del usuario se almacena en el **App Shell (`web-shell`)** y es consumido por todos los microfrontends. Los tipos de datos compartidos entre microfrontends residen en el paquete `shared-schemas`, y los componentes visuales reutilizables en `commons/ui`, evitando duplicación. Cada microfrontend define sus propios endpoints de consumo de API únicamente para las operaciones que le corresponden.

**Composición — Next.js Multi-Zones (no Module Federation):** el `web-shell` actúa como host y, mediante `rewrites` de Next, enruta cada `basePath` a la app del microfrontend correspondiente, todas bajo un mismo dominio. Se descartó Module Federation porque `@module-federation/nextjs-mf` solo soporta Pages Router y se descontinúa a fin de 2026; Multi-Zones es el camino nativo y estable de Next.js 15 para componer apps separadas (ver ADR-0006).

| Punto | Decisión |
|---|---|
| **App Shell** | `web-shell` — Next.js host que compone los MFs vía **Multi-Zones** (`rewrites` por `basePath`) |
| **MFs existentes** | `solicitudes`, `contratos`, `documentos`, `flujo`, `firmas`, `reportes`, `admin` (7 apps Next.js) |
| **Comunicación** | Cada MF consume el API del gateway mediante **RTK Query** (`fetchBaseQuery` + token JWT) |
| **Estado local** | Formularios y UI — local en cada MF |
| **Estado global** | Usuario y privilegios activos — **Redux en `web-shell`**, consumido por los MFs |
| **Permisos** | `<PrivilegeGuard privilege="CONTRACT_CREATE">` oculta/muestra funciones por privilegio dentro de cada MF |
| **Diseño consistente** | Componentes y tokens compartidos desde `commons/ui` (**Neobrutalism / shadcn + Tailwind v4**) |

### Preguntas guía del curso — Microfrontends

- **App Shell:** `web-shell` (host Multi-Zones) — login, layout global (navbar/footer) y estado de auth/privilegios.
- **¿Qué MFs existen?** Los 7 listados arriba, separados por dominio funcional.
- **¿Cómo consumen APIs?** Vía **RTK Query** contra el gateway; cada MF declara solo los endpoints que le corresponden.
- **Estado local vs global:** global (usuario/privilegios) en Redux del `web-shell`; local (formularios/UI) en cada MF.
- **¿Cómo se ocultan funciones por privilegio?** Con `<PrivilegeGuard privilege="...">` dentro de cada MF; la separación es por dominio, no por rol.
- **¿Cómo mantienen diseño consistente?** Todos consumen `commons/ui` (Neobrutalism/shadcn + Tailwind v4) y tokens compartidos; un componente vive en `commons/ui` solo si lo usa más de un MF.

### Atomic Design en `commons/ui`

```
atoms/       → Button, Input, Badge, StatusChip, SLAIndicator
molecules/   → FormField, DocumentCard, NotificationItem, SignaturePad
organisms/   → ContractForm, ReviewPanel, DocumentList, WorkflowStepper
templates/   → ContractLayout, AdminLayout, ReviewLayout
pages/       → Ensamblaje final en cada microfrontend
```

### Estructura interna de cada Microfrontend — Feature-based

Cada microfrontend organiza su código por feature, no por tipo de archivo. Esto evita que carpetas como `components/` crezcan sin estructura a medida que el módulo evoluciona.

```
solicitudes-mf/src/
├─ features/
│   ├─ create-contract/          # Formulario paso a paso
│   │   ├─ components/           # Componentes exclusivos de esta feature
│   │   ├─ hooks/                # useCreateContract, useVendorDocuments
│   │   └─ api/                  # RTK Query endpoints
│   ├─ contract-list/            # Listado con filtros
│   │   ├─ components/
│   │   ├─ hooks/
│   │   └─ api/
│   └─ contract-detail/          # Vista de detalle + historial
│       ├─ components/
│       ├─ hooks/
│       └─ api/
├─ app/                          # App Router de Next.js (basePath = /solicitudes)
│   ├─ page.tsx                  # /solicitudes
│   └─ [id]/page.tsx             # /solicitudes/:id
└─ next.config.ts                # basePath propio del MF (Multi-Zones)
```

**Regla:** Un componente vive en `commons/ui` solo si es reutilizado por más de un microfrontend. Si es exclusivo de una feature, vive dentro de esa feature.

El mismo patrón aplica a todos los microfrontends:

| MF | Features principales |
|---|---|
| `solicitudes-mf` | `create-contract`, `contract-list`, `contract-detail` |
| `contratos-mf` | `contract-editor`, `template-list`, `template-editor` |
| `documentos-mf` | `document-upload`, `document-versions`, `expiry-alerts` |
| `flujo-mf` | `review-panel`, `workflow-timeline`, `sla-dashboard` |
| `firmas-mf` | `signature-canvas`, `signature-detail` |
| `reportes-mf` | `audit-log`, `contract-reports`, `export` |
| `admin-mf` | `users`, `roles`, `areas`, `apoderados`, `workflow-config` |

---

## 6. Base de Datos — PostgreSQL + Prisma (schema-per-service)

Se usa **PostgreSQL** como motor de base de datos y **Prisma ORM** para el acceso a datos. Hay **un solo contenedor Postgres** (`clm_dev`) con **schema-per-service**: cada microservicio es dueño exclusivo de su schema lógico (`auth`, `contracts`, `workflow`, `documents`) y tiene su propio `schema.prisma`, usando el preview feature `multiSchema` de Prisma.

Las referencias entre dominios (p.ej. `Contract.createdBy` → `userId`) se guardan como `String`, **sin FK cross-schema**, preservando el desacople entre microservicios.

El mapeo entidad→schema, el esquema completo de entidades, relaciones y enumeraciones se documenta en [`base-datos.md`](./base-datos.md).

---

## 7. Roles y Privilegios

### Catálogo de privilegios

| Código | Descripción |
|---|---|
| `CONTRACT_CREATE` | Crear nueva solicitud |
| `CONTRACT_EDIT` | Editar solicitud antes de enviar |
| `CONTRACT_SUBMIT` | Enviar solicitud a revisión |
| `CONTRACT_CANCEL` | Cancelar un contrato en curso |
| `CONTRACT_RECOVER` | Reactivar una solicitud cancelada |
| `CONTRACT_REVIEW_ADMIN` | Revisar como Administrador |
| `CONTRACT_REVIEW_LAWYER` | Revisar como Abogado |
| `CONTRACT_APPROVE` | Aprobar formalmente (Aprobador) |
| `CONTRACT_SIGN` | Registrar firma simulada |
| `CONTRACT_VIEW_ALL` | Ver todos los contratos |
| `CONTRACT_VIEW_AREA` | Ver contratos del área propia |
| `DOCUMENT_UPLOAD` | Subir documentos |
| `DOCUMENT_VERSION` | Gestionar versiones |
| `WORKFLOW_CONFIG` | Configurar etapas del flujo |
| `USERS_MANAGE` | CRUD de usuarios |
| `AREAS_MANAGE` | CRUD de áreas |
| `APODERADOS_MANAGE` | CRUD de apoderados |
| `TEMPLATES_MANAGE` | CRUD de plantillas |
| `REPORTS_VIEW` | Ver reportes e historial |

### Asignación por rol

| Privilegio | Solicitante | Administrador | Abogado | Aprobador | Firmante |
|---|:---:|:---:|:---:|:---:|:---:|
| `CONTRACT_CREATE` | ✓ | | | | |
| `CONTRACT_EDIT` | ✓ | | | | |
| `CONTRACT_SUBMIT` | ✓ | | | | |
| `CONTRACT_CANCEL` | ✓ | ✓ | | | |
| `CONTRACT_RECOVER` | ✓ | ✓ | | | |
| `CONTRACT_REVIEW_ADMIN` | | ✓ | | | |
| `CONTRACT_REVIEW_LAWYER` | | | ✓ | | |
| `CONTRACT_APPROVE` | | | | ✓ | |
| `CONTRACT_SIGN` | | | | | ✓ |
| `CONTRACT_VIEW_AREA` | ✓ | | ✓ | ✓ | ✓ |
| `CONTRACT_VIEW_ALL` | | ✓ | | | |
| `DOCUMENT_UPLOAD` | ✓ | | ✓ | | |
| `DOCUMENT_VERSION` | ✓ | ✓ | ✓ | | |
| `WORKFLOW_CONFIG` | | ✓ | | | |
| `USERS_MANAGE` | | ✓ | | | |
| `AREAS_MANAGE` | | ✓ | | | |
| `APODERADOS_MANAGE` | | ✓ | | | |
| `TEMPLATES_MANAGE` | | ✓ | ✓ | | |
| `REPORTS_VIEW` | | ✓ | ✓ | ✓ | |

---

## 8. Flujo de Estados del Contrato

```
[DRAFT] ──submit──▶ [SUBMITTED] ──admin_approve──▶ [ADMIN_REVIEW]
                         │                               │
                    admin_reject                   lawyer_approve
                         ▼                               ▼
                      [DRAFT]                    [LAWYER_REVIEW]
                    (ping-pong)          lawyer_reject──▶ [DRAFT]
                                                         │
                                                  lawyer_approve
                                                         ▼
                                               [APPROVAL_PENDING]
                                                  │            │
                                               approve        reject
                                                  ▼            ▼
                                              [SIGNING]   [REJECTED]
                                                  │
                                                sign
                                                  ▼
                                              [SIGNED] ← final

Desde cualquier estado activo: ──cancel──▶ [CANCELLED]
Desde [CANCELLED]:             ──recover──▶ [DRAFT]
```

### Semáforo SLA

El **SLA (Service Level Agreement)** define el tiempo máximo permitido para que un responsable atienda un contrato en su etapa actual. Cada `WorkflowStage` tiene configurado un `slaHours`. El semáforo calcula cuánto tiempo ha transcurrido desde que el contrato entró a la etapa actual y lo traduce en un indicador visual de color para que el Administrador o Abogado identifique de un vistazo qué contratos requieren atención urgente.

`horasTranscurridas = now() - contractWorkflow.enteredAt`

| Color | Condición | Significado |
|---|---|---|
| Verde | `< slaHours × 0.6` | Dentro del tiempo, sin urgencia |
| Amarillo | `≥ slaHours × 0.6` y `< slaHours` | Próximo a vencer, requiere atención |
| Rojo | `≥ slaHours` | SLA vencido, contrato en mora |

---

## 9. API Endpoints

Todos los endpoints REST los **expone el gateway** en `http://localhost:3000`; Swagger en `/api/docs`. El gateway valida JWT/privilegios y reenvía cada operación al microservicio dueño vía Redis (la columna *Servicio* indica quién la resuelve).

| Grupo | Servicio que resuelve |
|---|---|
| `/auth/*`, `/users/*` | `auth-service` |
| `/contracts/*`, `/societies`, `/areas`, `/apoderados`, `/templates` | `contracts-service` |
| `/workflow/*`, `/notifications/*` | `workflow-service` |
| `/documents/*`, `/signatures/*` | `documents-service` |
| `/reports/*` | gateway agrega de los servicios dueños |

```
# Auth
POST   /auth/login              → { accessToken, refreshToken, privileges[] }
POST   /auth/refresh
POST   /auth/logout

# Users                         USERS_MANAGE
GET / POST / PATCH / DELETE  /users / /users/:id

# Contracts
POST   /contracts               CONTRACT_CREATE
GET    /contracts               CONTRACT_VIEW_ALL | CONTRACT_VIEW_AREA
GET    /contracts/:id
PATCH  /contracts/:id           CONTRACT_EDIT
POST   /contracts/:id/submit    CONTRACT_SUBMIT
POST   /contracts/:id/cancel    CONTRACT_CANCEL
POST   /contracts/:id/recover   CONTRACT_RECOVER

# Workflow
GET    /workflow/:contractId                      (estado + SLA calculado)
POST   /workflow/:contractId/approve             CONTRACT_REVIEW_ADMIN | LAWYER | APPROVE
POST   /workflow/:contractId/reject              CONTRACT_REVIEW_ADMIN | LAWYER
POST   /workflow/:contractId/return
GET    /workflow/stages
POST   /workflow/stages                          WORKFLOW_CONFIG
PATCH  /workflow/stages/:id                      WORKFLOW_CONFIG

# Documents
POST   /documents/:contractId                    DOCUMENT_UPLOAD (multipart)
GET    /documents/:contractId
GET    /documents/:id/versions
POST   /documents/:id/versions                   DOCUMENT_VERSION

# Signatures
POST   /signatures/:contractId                   CONTRACT_SIGN
GET    /signatures/:contractId

# Notifications
GET    /notifications
PATCH  /notifications/:id/read

# Reports                       REPORTS_VIEW
GET    /reports/contracts?status=&area=&assignee=
GET    /reports/audit/:contractId
GET    /reports/export?format=csv

# Catalogs
GET / POST / PATCH  /societies / /areas / /apoderados / /templates
```

---

## 10. Seguridad

### Flujo JWT

El JWT lo emite `auth-service`, pero se **valida en el gateway**, que es el único punto HTTP. Los microservicios confían en el contexto de usuario que el gateway propaga en el mensaje Redis.

```
1. POST /auth/login (gateway → auth-service por Redis) → accessToken (15 min) + refreshToken (7 días)
2. Cliente envía al gateway: Authorization: Bearer <accessToken>
3. JwtAuthGuard (gateway) valida y adjunta { userId, roles[], privileges[] } al request
4. PrivilegeGuard (gateway) verifica el privilegio requerido por el endpoint
5. El gateway reenvía la operación + contexto de usuario al microservicio dueño
```

### Guard de privilegio

```typescript
@RequirePrivilege('CONTRACT_CREATE')
@Post()
create(@CurrentUser() user: UserContext, @Body() dto: CreateContractDto) { ... }

@Injectable()
export class PrivilegeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string>('privilege', context.getHandler());
    if (!required) return true;
    const { user } = context.switchToHttp().getRequest();
    return user.privileges.includes(required);
  }
}
```

Los contratos en estado `SIGNED` solo son visibles para usuarios cuyo `areaId` coincide con el del contrato, salvo que tengan `CONTRACT_VIEW_ALL`.

---

## 11. Principios SOLID

| Principio | Aplicación en CLM |
|---|---|
| **S — Single Responsibility** | Cada microservicio tiene una responsabilidad acotada a su dominio. `workflow-service` solo gestiona transiciones/SLA; `documents-service` solo gestiona archivos y firmas. El gateway solo enruta. |
| **O — Open/Closed** | Las etapas del workflow viven en BD. El Administrador las edita sin tocar código. |
| **L — Liskov Substitution** | `CanvasSignature` y `ElectronicSignature` implementan `ISignatureStrategy` e intercambian sin condiciones especiales. |
| **I — Interface Segregation** | Privilegios granulares. Cada rol recibe exactamente lo que necesita — nada más. |
| **D — Dependency Inversion** | `ContractsService` depende de `IContractRepository`, no de Prisma directamente. NestJS inyecta la implementación. |

---

## 12. Patrones de Diseño

| Categoría | Patrón | Dónde | Por qué |
|---|---|---|---|
| **Creacional** | **Factory** | `documents-service`: `documents/factories/document-requirement.factory.ts` | Retorna los documentos requeridos según Persona Física o Moral sin condicionales dispersos. |
| **Estructural** | **Repository** | `*.repository.ts` en cada servicio (p.ej. `contracts-service`) | Abstrae Prisma. El service no conoce el ORM directamente. |
| **Estructural** | **Decorator** | `gateway`: `@RequirePrivilege()`, `@CurrentUser()` | Verificación de privilegios declarativa en el gateway, sin contaminar la lógica de negocio. |
| **Comportamiento** | **State Machine** | `workflow-service` (`workflow/state-machine/`) | Estados y transiciones controladas. Elimina estados inválidos. |
| **Comportamiento** | **Strategy** | `documents-service` (`signatures/strategies/`) | `CanvasSignature` / `ElectronicSignature` intercambiables sin cambiar el servicio. |
| **Comportamiento** | **Observer** | `workflow-service`: `WorkflowService` emite evento → `NotificationsService` lo consume | Cambio de estado dispara notificación. Desacopla lógica de negocio y notificaciones. |

---

## 13. Documentación de la API — Swagger

La documentación de la API se genera con **Swagger** (`@nestjs/swagger`) en el **gateway**, como fuente única de la API REST. La interfaz interactiva está disponible en `http://localhost:3000/api/docs` y permite probar cada endpoint directamente desde el navegador. Los microservicios no exponen Swagger propio (no tienen HTTP público).

---

## 14. Manejo Centralizado de Errores

Un `GlobalExceptionFilter` en el **gateway** intercepta todas las excepciones no controladas y devuelve un formato JSON uniforme. Los fallos de transporte entre gateway y microservicios (timeout o caída de Redis) se traducen a `503/504` uniformes en lugar de exponer el error de mensajería al cliente.

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Error interno del servidor';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Registrado globalmente en `main.ts`:

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

Los servicios lanzan `HttpException` estándar (`NotFoundException`, `ForbiddenException`, `BadRequestException`) — el filtro los normaliza. Los errores inesperados no exponen stack traces al cliente.

---

## 15. Documentos por Tipo de Proveedor

| Documento | Persona Física | Persona Moral |
|---|:---:|:---:|
| INE / Identificación oficial | ✓ | |
| RFC | ✓ | ✓ |
| CURP | ✓ | |
| Comprobante de domicilio | ✓ | ✓ |
| Acta Constitutiva | | ✓ |
| Poder Notarial | | ✓ |
| Cédula de Situación Fiscal | ✓ | ✓ |
| Carátula de Estado de Cuenta | ✓ | ✓ |

Gestionado por `DocumentRequirementFactory` en `documents-service` — patrón Factory + principio O de SOLID.

---

## 16. Módulo Funcional de Referencia

**Solicitudes + Flujo de Revisión básico** — ciclo completo demostrable:

- [x] Crear solicitud (datos generales, área, tipo de proveedor)
- [x] Documentos requeridos dinámicos según tipo de proveedor
- [x] Enviar a revisión del Administrador
- [x] Administrador aprueba o rechaza con comentario (ping-pong)
- [x] Bitácora de cada acción con timestamp y usuario
- [x] Notificación interna al responsable siguiente
- [x] Semáforo SLA en panel del revisor
- [x] Login JWT con roles y privilegios
- [x] Guard de privilegio en cada endpoint
- [x] API documentada en Swagger (`/api/docs`)

**Cobertura por componentes:** frontend `solicitudes-mf` + `flujo-mf`; backend `gateway` + `auth-service` + `contracts-service` + `workflow-service` (con su módulo Notifications/Observer). Los demás MFs y `documents-service` quedan scaffoldeados para crecer en sprints posteriores.

---

## 17. Docker Compose — Infraestructura Local

`infra/docker/compose/docker-compose.dev.yml` levanta **solo la infraestructura** (PostgreSQL + Redis). El gateway, los microservicios y los microfrontends se corren con `pnpm dev` / `pnpm dev:core` (Turborepo), no en contenedores, para iterar rápido en desarrollo.

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: clm_dev
      POSTGRES_USER: clm_user
      POSTGRES_PASSWORD: clm_pass
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7
    ports: ["6379:6379"]   # transporte pub/sub gateway ↔ microservicios

volumes:
  postgres_data:
```

PostgreSQL aloja un solo contenedor con los schemas `auth`, `contracts`, `workflow`, `documents`. Cada microservicio usa la misma `DATABASE_URL` apuntando a su schema (`?schema=...`) y `REDIS_URL` para el transporte. Ver [`docs/03-runbooks/ejecutar-proyecto.md`](../03-runbooks/ejecutar-proyecto.md).

---

## 18. ADRs Clave

**ADR-0001 — Monorepo con Turborepo + pnpm**
Builds incrementales y cacheados. Configuración compartida de TypeScript y Biome. Un solo repositorio para frontend y backend.

**ADR-0002 — Microservicios NestJS + API Gateway**
El backend se estructura como un **API Gateway** (único punto HTTP REST) + **4 microservicios** (`auth`, `contracts`, `workflow`, `documents`) + una librería `commons`. Sustituye al monolito modular previo para cumplir el requisito del curso de microservicios y permitir despliegue/escalado por dominio. El gateway concentra JWT, privilegios y Swagger; cada servicio es autónomo y dueño de su schema. Trade-off aceptado: mayor complejidad operacional (más procesos en dev) mitigada con `pnpm dev:core`.

**ADR-0003 — JWT con privilegios en payload**
Evita queries a BD en cada request. El Guard verifica el token directamente. Tokens de corta duración (15 min) minimizan el riesgo de robo.

**ADR-0004 — State Machine con etapas en BD**
El Administrador puede configurar etapas sin redeploy. El motor de estados está cerrado a modificación pero abierto a nuevas configuraciones — principio Open/Closed.

**ADR-0005 — Prisma ORM**
Type-safety auto-generada, migraciones explícitas y versionadas. El `schema.prisma` de cada servicio es la fuente de verdad de su porción del modelo de datos.

**ADR-0006 — Microfrontends con Next.js Multi-Zones**
La composición de microfrontends se hace con **Next.js Multi-Zones** (el `web-shell` enruta cada `basePath` a su app vía `rewrites`), no con Module Federation. Razón: `@module-federation/nextjs-mf` solo soporta Pages Router y se descontinúa a fin de 2026, y Module Federation + App Router está roto. Multi-Zones es el mecanismo nativo y estable de Next.js 15 para apps separadas bajo un dominio. Trade-off: la navegación entre zonas es navegación de página completa (no comparte runtime), aceptable para el alcance.

**ADR-0007 — Transporte Redis pub/sub entre gateway y servicios**
La comunicación gateway ↔ microservicios usa **Redis pub/sub** vía `@nestjs/microservices` (`Transport.REDIS`): request-response con `ClientProxy.send()` y eventos con `emit()`. Elegido por simplicidad (sin broker pesado). Caveat: *fire-and-forget*, sin garantía de entrega. Aceptable para el alcance del curso; Kafka + outbox queda como mejora avanzada futura para eventos durables (bitácora/Observer).

**ADR-0008 — Schema-per-service en un solo PostgreSQL**
Un solo contenedor Postgres (`clm_dev`) con **un schema por servicio** (`auth`, `contracts`, `workflow`, `documents`), usando el preview feature `multiSchema` de Prisma. Da aislamiento lógico de datos por servicio (fiel a microservicios) sin el coste operacional de una BD por servicio. Las referencias cross-dominio se guardan como `String` (sin FK cross-schema) para preservar el desacople; la integridad se valida en el servicio dueño.

> Los ADR se versionan también como archivos individuales en [`decisions/`](./decisions/).

---

## 19. Estrategia de Ramas

| Rama | Propósito |
|---|---|
| `main` | Producción estable. Solo recibe merges desde `release/*` |
| `dev` | Integración del equipo. Base para todas las features |
| `qa` | Pruebas. Se sincroniza desde `dev` antes de cada ciclo |
| `release/x.y.z` | Estabilización previa a producción |
| `feature/[modulo]-[descripcion]` | Ej: `feature/solicitudes-create-form` |
| `fix/[descripcion]` | Ej: `fix/sla-calculation-overflow` |
| `docs/[descripcion]` | Ej: `docs/swagger-workflow` |

Todo cambio a `dev` pasa por Pull Request con revisión de al menos un compañero. Las ramas se eliminan al hacer merge. Se actualiza con `git rebase dev` diariamente para evitar conflictos.

### Convención de Commits — Conventional Commits

```
<tipo>(<scope>): <descripción corta>
```

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `chore` | Mantenimiento, dependencias, configuración |
| `docs` | Documentación |
| `refactor` | Cambio interno sin impacto funcional |
| `test` | Tests |
| `style` | Formato, sin lógica |

Ejemplos:
```
feat(contracts): agregar endpoint POST /contracts
fix(workflow): corregir cálculo de SLA cuando enteredAt es null
chore(deps): actualizar @nestjs/swagger a 7.4
docs(api): documentar endpoints de firmas en Swagger
```

`commitlint` + Husky (`commit-msg` hook) rechazan commits que no sigan este formato.

# ALETHEIA — Resumen del proyecto (estado y arquitectura)

> Sistema **CLM (Contract Lifecycle Management)**: gestiona el ciclo de vida del contrato
> desde la solicitud hasta la firma, pasando por revisión de Administrador, Abogado y
> aprobación. Proyecto académico con requisitos obligatorios: **SOFEA + microfrontends +
> microservicios + Next.js/NestJS + PostgreSQL + JWT/roles/privilegios**.

Última actualización: 2026-06-03.

---

## 1. Arquitectura

**Monorepo único** (Turborepo + pnpm) con la raíz git = raíz del monorepo.

```
[ Navegador ]
      │
      ▼
[ web-shell : Next.js host (SOFEA) ]  ── Multi-Zones ──▶ [ 7 microfrontends Next.js ]
      │  REST + JSON (RTK Query)
      ▼
[ API Gateway : NestJS HTTP + Swagger + JWT ]
      │  Redis pub/sub (@nestjs/microservices)
      ├──▶ auth-service       (schema auth)
      ├──▶ contracts-service  (schema contracts)
      ├──▶ workflow-service   (schema workflow)
      └──▶ documents-service  (schema documents)
                  │
                  ▼
            [ PostgreSQL 16 ]  (schema-per-service)  +  [ Redis ]
```

- **Frontend = SOFEA + Microfrontends**: un host (`web-shell`) compone 7 apps Next.js
  independientes vía **Next.js Multi-Zones** (no Module Federation — está roto en App
  Router 15 y el plugin se descontinúa). Cada MF tiene su `basePath`.
- **Backend = Microservicios**: un **API Gateway** (único borde HTTP/REST con Swagger y
  JWT) que enruta a 4 microservicios NestJS por **Redis pub/sub**.
- **Datos = schema-per-service**: un PostgreSQL, un schema lógico por servicio; las
  referencias cross-dominio se guardan como `Int` (sin FK cross-schema).

---

## 2. Patrones de diseño y principios

**Principios SOLID** aplicados (S: cada módulo/servicio una responsabilidad; O: etapas de
workflow configurables sin tocar código; L/I: estrategias de firma intercambiables,
privilegios granulares; D: services dependen de abstracciones/Prisma inyectado).

| Patrón | Categoría | Dónde |
|---|---|---|
| **Factory** | Creacional | Documentos requeridos según tipo de proveedor (PF/PM) |
| **Repository** | Estructural | Acceso a datos vía Prisma por servicio |
| **Decorator** | Estructural | `@RequirePrivilege()`, `@CurrentUser()` (gateway) |
| **State Machine** | Comportamiento | Transiciones de estado del contrato (workflow) |
| **Strategy** | Comportamiento | Firma (canvas / electrónica) |
| **Observer** | Comportamiento | Workflow → Notifications al cambiar de etapa |
| **API Gateway** | Integración | Punto único de entrada a los microservicios |

**Frontend**: Atomic Design + arquitectura **feature-based** por MF; RBAC declarativo
(`useRole`, `<PrivilegeGuard>`); design system compartido en un paquete.

---

## 3. Stack

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo + Biome + Husky + Commitlint |
| Backend | NestJS 11, Prisma 6, PostgreSQL 16, Redis (transporte), Swagger |
| Frontend | Next.js 15 (App Router), React 19, Tailwind v4, Redux Toolkit/RTK Query |
| Design System | **Neobrutalism** (shadcn) — teal `#15A8B5`, DM Sans/Anton/IBM Plex Mono |

---

## 4. Estructura del repo

```
ALETHEIA/
├─ .claude/                 # este resumen
├─ docs/                    # documentación (00-overview, 01-architecture[ADRs], 02-api, 03-runbooks, 04-product, changelog)
├─ infra/docker/compose/    # docker-compose.dev.yml (postgres + redis)
├─ packages/shared-schemas/ # tipos compartidos front↔back
└─ apps/
   ├─ backend/
   │  ├─ gateway/           # REST + Swagger + JWT → enruta por Redis
   │  ├─ services/{auth,contracts,workflow,documents}-service/
   │  └─ commons/           # guards/JWT, filtros, interceptores, patrones Redis
   └─ frontend/
      ├─ web-shell/         # host Multi-Zones + login por roles + dashboard RBAC
      ├─ microfrontends/{solicitudes,contratos,documentos,flujo,firmas,reportes,admin}-mf
      └─ commons/           # @aletheia/frontend-commons: design system + RBAC compartido
```

---

## 5. Qué está FUNCIONANDO

### Backend (compila ✅ — `pnpm turbo build` verde)
- Gateway HTTP + Swagger (`/api/docs`) + guards JWT/privilegios globales.
- `auth-service` con login/refresh/logout reales (bcrypt + JWT + RefreshToken) por Redis,
  Prisma schema `auth` + seed (`admin@aletheia.com` / `password123`).
- `contracts/workflow/documents-service` booteables (Redis) con su Prisma schema y handler ping.
- ⏳ **Pendiente runtime**: levantar Docker (postgres+redis) + migraciones + probar
  `login` end-to-end gateway→auth (requiere Docker Desktop arrancado y `pnpm db:migrate`).

### Dependencias (2026-06-03)
- `pnpm install` verificado ✅ — `node_modules` generado correctamente en la raíz del monorepo.
- `pnpm dev:fe` verificado ✅ — los 8 frontends arrancan en paralelo (puertos 4000–4007).

### Frontend (compila ✅ 8/8 + validado en vivo)
- **web-shell**: login con **5 botones de rol** (mock, sin backend) → dashboard que
  **valida privilegios** (muestra/oculta acciones por rol). Redux + cookie + localStorage.
- **Design system compartido** (`@aletheia/frontend-commons`) consumido por el host y los 7 MFs.
- **RBAC cross-zone por cookie**: cada MF lee el rol y gatea sus acciones.
- **7 microfrontends con sus flujos completos (mock):**
  - `solicitudes`: listado (filtros + estado + SLA, scoping por área), crear (folio auto,
    PF/PM, docs requeridos dinámicos), detalle + bitácora, enviar/cancelar/recuperar.
  - `contratos`: CRUD plantillas + editor WYSIWYG-lite + elaborar documento desde plantilla.
  - `documentos`: carga requeridos por tipo, versionado, control de vigencia.
  - `flujo`: panel de revisión por rol (aprobar/rechazar/devolver), semáforo SLA, línea de tiempo.
  - `firmas`: canvas de firma (base64) + apoderado, detalle de firma.
  - `reportes`: KPIs, filtros, exportar CSV, bitácora de auditoría.
  - `admin`: CRUD usuarios/áreas/apoderados + configuración de etapas del flujo.

> Validado con Playwright: login por rol, contraste de privilegios (Admin vs Solicitante),
> y MFs reales (solicitudes, flujo/SLA, admin, reportes) renderizando con el design system.

---

## 6. Cómo correr

```powershell
pnpm install       # instala todas las dependencias del workspace (verificado ✅)
pnpm infra:up      # postgres + redis (requiere Docker Desktop arrancado)
pnpm dev           # TODO (8 frontends + gateway + 4 servicios)
pnpm dev:fe        # SOLO los 8 frontends (host + 7 MFs) — funciona sin Docker (verificado ✅)
pnpm dev:core      # subset: gateway + auth/contracts/workflow + web-shell + solicitudes-mf + flujo-mf
```

> Guía completa para el equipo: `docs/DocumentacionParaElEquipo/como-ejecutar.md`

**Puertos del frontend** (Multi-Zones — se entra siempre por el host :4000, que reescribe a cada MF):

| App | Puerto | Ruta vía host |
|---|---|---|
| web-shell (host) | 4000 | `/` |
| solicitudes-mf | 4001 | `/solicitudes` |
| contratos-mf | 4002 | `/contratos` |
| documentos-mf | 4003 | `/documentos` |
| flujo-mf | 4004 | `/flujo` |
| firmas-mf | 4005 | `/firmas` |
| reportes-mf | 4006 | `/reportes` |
| admin-mf | 4007 | `/admin` |

- **Entrar por:** http://localhost:4000 (login por rol, mock sin backend) · Swagger gateway: http://localhost:3000/api/docs
- Cada MF devuelve **404 en su raíz a propósito**: se monta bajo su `basePath` (`/solicitudes`, `/admin`, …); el host lo reescribe.
- ⚠️ **Windows**: `dev:fe` debe usar filtros explícitos por MF, **no** `--filter='*-mf'` — cmd.exe pasa las comillas simples literales y turbo solo levantaría `web-shell`.

Usuario seed (cuando el backend esté en runtime): `admin@aletheia.com` / `password123`.

---

## 7. Próximos pasos

1. **Backend en runtime**: arrancar Docker, correr migraciones por servicio
   (`pnpm --filter @aletheia/auth-service db:migrate` …) + seed, y validar el login
   end-to-end gateway→auth por Redis.
2. **Conectar frontend ↔ backend**: reemplazar los mocks por **RTK Query** contra el
   gateway; mover el login del web-shell a `POST /auth/login` real (JWT en cookie httpOnly).
3. **Implementar lógica de negocio en los servicios** (hoy solo `auth` tiene lógica real):
   contracts (CRUD + folio + AuditLog), workflow (State Machine + SLA + Observer→notifications),
   documents (Factory + versionado), signatures (Strategy canvas).
4. **Notifications + Observer** reales y bitácora persistida (AuditLog).
5. **Promover a `commons`** los primitives de UI que los MFs crearon localmente
   (select, modal, textarea, tabs, switch, rich-text) para unificar el design system.
6. **Tests** (Jest backend, Testing Library/Playwright frontend) y **CI**.
7. **Endurecer seguridad**: refresh token rotation, validación de privilegios por endpoint
   en el gateway para cada microservicio.
8. **Despliegue** (Dokploy): definir compose/Dockerfiles de producción por servicio y MF.

---

## 8. Decisiones y notas

- **UI = Neobrutalism** (confirmado con el profesor; el doc del curso sugería MUI).
- **Transporte = Redis pub/sub** (simple; Kafka queda como mejora avanzada).
- **No Module Federation** → Multi-Zones por compatibilidad con Next 15 App Router.
- Specs y ADRs detallados en `docs/01-architecture/` y `docs/superpowers/specs/`.
- Convención de ramas y commits (Conventional Commits + commitlint) en `docs/`.

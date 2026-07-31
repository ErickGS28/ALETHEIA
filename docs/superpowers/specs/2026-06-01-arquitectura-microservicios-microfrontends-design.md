# Diseño — Reestructura a Microservicios + Microfrontends (CLM ALETHEIA)

**Fecha:** 2026-06-01
**Estado:** Aprobado para spec (pendiente revisión escrita del usuario)
**Autor:** Barcelata + Claude

---

## 1. Contexto y motivación

El proyecto **ALETHEIA** es un sistema CLM (Contract Lifecycle Management). El doc de
referencia del curso ([Implementación de Referencia](https://florentine-bug-aec.notion.site/Implementaci-n-de-Referencia-364a3d7d603a803e9a26f56e5b577193))
fija una **base obligatoria** que contradice la arquitectura previa (monolito modular):

| Área | Requisito obligatorio del curso |
|---|---|
| Arquitectura general | SOFEA |
| Frontend | Microfrontends como apps separadas · Next.js + TypeScript |
| Backend | **Microservicios** · NestJS (Prisma/TypeORM) |
| Base de datos | PostgreSQL |
| API Docs | OpenAPI / Swagger / Scalar / ApiDog |
| Seguridad | JWT, roles y privilegios (multirol/multiprivilegio) |
| Implementación | Al menos un módulo funcional completo |
| Repositorio | Monorepo o multiapp ordenada |

**Problemas estructurales actuales que esta reestructura resuelve:**
1. El monorepo (`clm-system/`) está **anidado** dentro del repo git (`ALETHEIA/`). Husky
   no encuentra `.git` (el hook `prepare` falla en cada install).
2. El backend es **una sola app NestJS** (monolito modular) → debe ser microservicios.
3. El frontend es **boilerplate** sin estructura de microfrontends.
4. Mezcla de gestores de paquetes (npm en frontend + pnpm en raíz).
5. Nombres frágiles (`changelog(historial)/`) y README vacío (contiene `"a"`).

---

## 2. Decisiones de arquitectura (aprobadas)

| # | Tema | Decisión |
|---|---|---|
| D1 | Monorepo | Turborepo + pnpm, **aplanado a la raíz git** (`ALETHEIA/` = raíz del monorepo), front + back juntos |
| D2 | Backend | **API Gateway + 4 microservicios**: `auth`, `contracts`, `workflow`, `documents` + librería `commons` |
| D3 | Transporte | **Redis pub/sub** (`@nestjs/microservices`, `Transport.REDIS`) |
| D4 | Frontend | **web-shell (host) + 7 microfrontends** + `commons`, composición vía **Next.js Multi-Zones** |
| D5 | Librería UI | **Neobrutalism/shadcn + Tailwind v4** (NO MUI — ver Riesgo R1) |
| D6 | Datos | **1 PostgreSQL, schema-per-service** (Prisma `multiSchema`); cada servicio dueño de su schema |
| D7 | Scaffolding | Alinear al recomendado del curso (`docs/ infra/ scripts/ packages/`). La carpeta `agents/` del curso (tooling IA) queda fuera de alcance |
| D8 | Migración | **NO eliminar archivos**, solo renombrar/reorganizar |
| D9 | API Docs | Swagger en el gateway (`/api/docs`) como fuente única REST |

### Justificación de las no-obvias

- **D3 (Redis pub/sub):** simple, sin broker pesado. Caveat: *fire-and-forget*, sin
  garantía de entrega. Aceptable para el alcance del curso. Kafka (eventos durables)
  queda como mejora "avanzada" futura para la bitácora/Observer.
- **D4 (Multi-Zones):** `@module-federation/nextjs-mf` solo soporta Pages Router y se
  descontinúa a fin de 2026; Module Federation + App Router está roto. Multi-Zones es el
  camino nativo y estable de Next.js 15 para apps separadas bajo un dominio.
- **D6 (schema-per-service):** aislamiento lógico de datos por servicio (fiel a
  microservicios) con un solo contenedor Postgres. DB-per-service es overkill para el curso.

---

## 3. Estructura objetivo del repositorio

```
ALETHEIA/                              # raíz git = raíz monorepo
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├─ biome.json  commitlint.config.cjs  .husky/{pre-commit,commit-msg}
├─ README.md  .gitignore  .editorconfig  .nvmrc  .npmrc
├─ docs/
│  ├─ 00-overview/         # vision, principles, glossary  ← DocumentacionParaElEquipo
│  ├─ 01-architecture/     # c4/, decisions/ADR-*, standards/
│  ├─ 02-api/              # openapi/, postman/
│  ├─ 03-runbooks/         # local-dev, ejecutarProyecto
│  ├─ 04-product/          # HistoriasDeUsuario, PropuestaBD
│  ├─ changelog/           # ← changelog(historial)/ renombrado
│  └─ superpowers/specs/   # este doc
├─ infra/docker/compose/   # docker-compose.dev.yml (postgres + redis)
├─ scripts/                # dev, bootstrap, lint, test
├─ packages/
│  └─ shared-schemas/      # tipos compartidos front↔back (ya existe)
└─ apps/
   ├─ frontend/
   │  ├─ web-shell/                  # host Multi-Zones: login, layout, estado auth global
   │  ├─ microfrontends/
   │  │  ├─ solicitudes-mf/  contratos-mf/  documentos-mf/
   │  │  ├─ flujo-mf/  firmas-mf/  reportes-mf/  admin-mf/
   │  └─ commons/                    # ui (neobrutalism/shadcn), hooks, state (RTK), api (RTK Query), utils
   └─ backend/
      ├─ gateway/                    # NestJS HTTP REST + Swagger + JWT guard → enruta a servicios
      ├─ services/
      │  ├─ auth-service/            # auth + users + roles/privilegios
      │  ├─ contracts-service/       # contracts + catalogs (areas, societies, apoderados, templates)
      │  ├─ workflow-service/        # workflow (state machine + SLA) + notifications (observer)
      │  └─ documents-service/       # documents (versionado, factory) + signatures (strategy)
      └─ commons/                    # contracts (DTOs/eventos), observability (logger), security (JWT), utils
```

---

## 4. Backend — microservicios

### 4.1 Componentes y responsabilidades

| Servicio | Responsabilidad | Schema Prisma | Privilegios clave |
|---|---|---|---|
| `gateway` | Único punto HTTP REST. Valida JWT, aplica `PrivilegeGuard`, expone Swagger, enruta a servicios vía Redis. No tiene lógica de negocio ni BD. | — | — |
| `auth-service` | Login/refresh/logout, usuarios, roles, privilegios, RefreshToken. Emite y valida JWT. | `auth` | USERS_MANAGE |
| `contracts-service` | Contratos (CRUD, folio, estados base) + catálogos (areas, societies, apoderados, templates). | `contracts` | CONTRACT_*, AREAS/TEMPLATES/APODERADOS_MANAGE |
| `workflow-service` | State machine de transiciones, SLA, ContractWorkflow/Transition + Notifications (Observer). | `workflow` | CONTRACT_REVIEW_*, WORKFLOW_CONFIG |
| `documents-service` | Documentos (upload, versionado, Factory por tipo proveedor) + Firmas (Strategy canvas). | `documents` | DOCUMENT_*, CONTRACT_SIGN |

### 4.2 Comunicación

- **Cliente → gateway:** HTTP REST + JSON (Authorization: Bearer).
- **gateway → servicios:** Redis pub/sub (request-response via `ClientProxy.send()` y
  eventos via `emit()`).
- **Eventos (Observer):** `workflow-service` emite eventos de cambio de estado;
  el mismo servicio (módulo notifications) los consume para crear notificaciones.
- **AuditLog:** side-effect dentro de cada servicio en cada mutación relevante.

### 4.3 Datos (schema-per-service)

- Un contenedor Postgres `clm_dev`, con schemas `auth`, `contracts`, `workflow`, `documents`.
- Prisma con `multiSchema` preview feature; cada servicio tiene su propio `schema.prisma`
  apuntando a su schema lógico.
- Las referencias entre dominios (p.ej. `Contract.createdBy` → userId) se guardan como
  String (no FK cross-schema), preservando el desacople de microservicios. Este criterio
  ya estaba documentado en `PropuestaBD.md`.

### 4.4 Manejo de errores entre servicios

- `GlobalExceptionFilter` en el gateway normaliza la respuesta HTTP.
- Timeouts y fallos de transporte Redis → el gateway responde `503/504` uniforme.
- Patrón Circuit Breaker queda como mejora avanzada futura (no en alcance inicial).

---

## 5. Frontend — microfrontends (Multi-Zones)

### 5.1 Componentes

- **web-shell (host):** layout global, navbar/footer, login, estado de auth/privilegios
  (Redux), y `rewrites` de Next que enrutan a cada MF bajo un dominio.
- **7 MFs:** `solicitudes`, `contratos`, `documentos`, `flujo`, `firmas`, `reportes`, `admin`.
  Cada uno es una **app Next.js independiente** con `basePath` propio (p.ej. `/solicitudes`).
- **commons/:** `ui` (neobrutalism/shadcn), `hooks`, `state` (RTK), `api` (RTK Query con
  `fetchBaseQuery` + token JWT), `utils`. Un componente vive en `commons/ui` solo si lo usa
  más de un MF.

### 5.2 Estado y permisos

- **Estado global** (usuario, privilegios): Redux en `web-shell`, consumido por los MFs.
- **Estado local** (formularios/UI): local a cada MF.
- **Permisos:** `<PrivilegeGuard privilege="...">` oculta/muestra por privilegio dentro de
  cada MF. La separación de MFs es por **dominio funcional, no por rol**.

### 5.3 Alcance de implementación inicial

- **Scaffoldear los 7 MFs** (carpeta + app Next mínima que arranca).
- **Implementar a fondo `solicitudes-mf` + `flujo-mf`** (cubre el "módulo funcional
  completo" exigido: solicitud → revisión con bitácora, notificación y SLA).
- Los otros 5 quedan listos para crecer en sprints posteriores.

---

## 6. Ejecución local (un solo comando)

- `pnpm infra:up` → `docker compose -f infra/docker/compose/docker-compose.dev.yml up -d`
  (postgres + redis).
- `pnpm dev` → `turbo dev` levanta gateway + 4 servicios + web-shell + 7 MFs en paralelo.
- `pnpm dev:core` (filtrado con turbo) → solo gateway + auth + contracts + workflow +
  web-shell + solicitudes-mf + flujo-mf. **Recomendado en laptop** (correr las ~15 apps
  completas es pesado).
- Swagger del gateway en `http://localhost:3000/api/docs`.

---

## 7. Plan de migración (sin eliminar archivos)

1. **Aplanar:** mover `clm-system/*` a la raíz `ALETHEIA/`. `.husky/` queda junto a `.git`.
2. **Backend:**
   - `apps/backend/src/auth/` → base de `apps/backend/services/auth-service/`.
   - `apps/backend/src/common/` → `apps/backend/commons/`.
   - Crear `gateway/` y los 4 `services/*`; repartir los módulos stub a su servicio.
   - Dividir el `schema.prisma` único en un schema por servicio (schema-per-service).
3. **Frontend:**
   - `apps/frontend/web-shell/` se queda como host (mover `components/ui/` a
     `apps/frontend/commons/ui/` cuando lo consuma >1 MF).
   - Crear `microfrontends/*` (7) y `commons/`.
4. **Docs:** `DocumentacionParaElEquipo/` y `changelog(historial)/` → `docs/` (renombrados).
   `ejecutarProyecto.md` → `docs/03-runbooks/`.
5. **Higiene:** README real; aprobar build scripts pnpm
   (`onlyBuiltDependencies`: prisma, @nestjs/core, @biomejs/biome, sharp, @scarf/scarf);
   eliminar el `package-lock.json` del frontend ya hecho (npm) y unificar en pnpm.
6. **Git:** trabajar en rama `feature/restructure-microservices` (NO commit/push automático;
   push dispara deploy en Dokploy — se hace solo cuando Barcelata lo pida).

> Toda reubicación es `git mv` / mover, nunca borrar contenido. Los docs viejos que ya no
> describan la arquitectura (p.ej. ADR-0002 "monolito modular") se **actualizan**, no se borran.

---

## 8. Riesgos y mitigaciones

| ID | Riesgo | Mitigación |
|---|---|---|
| R1 | **MUI obligatorio** pero usamos Neobrutalism/shadcn | Decisión explícita del usuario de conservar Neobrutalism. Confirmar con el profesor si MUI es estricto; si lo es, MUI con theme custom es el plan B. |
| R2 | 15 procesos en dev (8 Next + gateway + 4 svc + pg + redis) | `pnpm dev:core` filtrado; scaffoldear 7 MFs pero implementar 2. |
| R3 | Redis pub/sub sin garantía de entrega | Aceptable para curso; Kafka + outbox como mejora avanzada documentada. |
| R4 | Cross-schema sin FKs reales | IDs como String + validación en servicio (ya en PropuestaBD.md). |
| R5 | Reestructura grande rompe lo que ya corre | Rama feature, mover sin borrar, validar build por app antes de integrar. |

---

## 9. Fuera de alcance (YAGNI por ahora)

- Kafka, Saga, Circuit Breaker, k8s/Helm, Jenkins CI, observabilidad (otel/grafana/prometheus),
  multi-tenancy. Las carpetas del scaffolding pueden existir vacías como placeholders, pero
  **no se implementan** en esta fase.
- Implementación a fondo de 5 de los 7 microfrontends.
- Firma electrónica (solo canvas/Strategy queda con la interfaz lista).

---

## 10. Criterios de aceptación de la reestructura

1. `pnpm install` desde la raíz sin el error `prepare: .git can't be found`.
2. `pnpm dev:core` levanta gateway + servicios core + web-shell + solicitudes/flujo MFs.
3. Swagger del gateway responde en `/api/docs`.
4. `POST /auth/login` (vía gateway → auth-service por Redis) devuelve tokens + privilegios.
5. Estructura de carpetas coincide con la sección 3.
6. Ningún archivo previo eliminado (solo movido/renombrado/actualizado).

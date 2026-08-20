# ALETHEIA — CLM (Contract Lifecycle Management)

Sistema de gestión del ciclo de vida de contratos: desde la **solicitud**, pasando por la
**revisión** (Administrador y Abogado), la **aprobación** y la **firma** simulada. Construido
como **microservicios + microfrontends** en un monorepo.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | **NestJS** — API Gateway + 4 microservicios, transporte **Redis pub/sub** (`@nestjs/microservices`) |
| Base de datos | **PostgreSQL 16** con **schema-per-service** (Prisma `multiSchema`) |
| Frontend | **Next.js + TypeScript** — App Shell + 7 microfrontends (**Multi-Zones**) |
| UI | Neobrutalism / shadcn + Tailwind v4 · estado con Redux + RTK Query |
| API Docs | **OpenAPI / Swagger** en el gateway (`/api/docs`) |
| Seguridad | **JWT** + roles y privilegios (multirol/multiprivilegio) |
| Monorepo | **pnpm** (10.8.1) + **Turborepo** · Biome · Husky + commitlint |

---

## Estructura

```
ALETHEIA/                         # raíz git = raíz monorepo
├─ apps/
│  ├─ frontend/
│  │  ├─ web-shell/               # host Multi-Zones (login, layout, auth global)
│  │  ├─ microfrontends/          # solicitudes · contratos · documentos · flujo · firmas · reportes · admin (-mf)
│  │  └─ commons/                 # ui · hooks · state · api · utils
│  └─ backend/
│     ├─ gateway/                 # HTTP REST + Swagger + JWT → enruta vía Redis
│     ├─ services/                # auth · contracts · workflow · documents (-service)
│     └─ commons/                 # contracts · observability · security · utils
├─ packages/shared-schemas/       # tipos compartidos front ↔ back
├─ infra/docker/compose/          # docker-compose.dev.yml (postgres + redis)
├─ scripts/
└─ docs/                          # documentación del proyecto
```

Cada microservicio es dueño de su schema (`auth`, `contracts`, `workflow`, `documents`).
Las referencias entre dominios se guardan como `String` (sin FK cross-schema).

---

## Cómo correr

Prerequisitos: Node ≥ 20, pnpm 10.8.1, Docker. Todo desde la raíz.

```bash
pnpm install        # instala el workspace
pnpm infra:up       # levanta PostgreSQL + Redis (docker compose)
pnpm db:migrate     # migraciones Prisma por servicio
pnpm db:seed        # roles, privilegios y catálogos base
pnpm dev:core       # gateway + auth/contracts/workflow + web-shell + solicitudes-mf + flujo-mf
```

- Swagger: http://localhost:3000/api/docs
- web-shell: http://localhost:4000
- `pnpm dev` levanta **todo** (15 procesos). Guía completa: [`docs/03-runbooks/ejecutar-proyecto.md`](docs/03-runbooks/ejecutar-proyecto.md).

---

## Documentación

**Para entender el proyecto** (léelos en este orden, sin necesidad de tocar código):

| Doc | Contenido |
|---|---|
| [`docs/00-overview/vision-general.md`](docs/00-overview/vision-general.md) | Empieza aquí — qué es el proyecto, la idea central, y mapa del resto de la documentación |
| [`docs/04-product/roles.md`](docs/04-product/roles.md) | Qué hace cada rol, en lenguaje de negocio, con la matriz de privilegios |
| [`docs/04-product/flujo-y-estados.md`](docs/04-product/flujo-y-estados.md) | El ciclo de vida del contrato: los 7 estados, quién dispara cada transición, caminos alternativos |
| [`docs/01-architecture/arquitectura-explicada.md`](docs/01-architecture/arquitectura-explicada.md) | Por qué la arquitectura es así, en lenguaje llano, con el recorrido de una petición real |

**Referencia técnica:**

| Doc | Contenido |
|---|---|
| [`docs/01-architecture/implementacion.md`](docs/01-architecture/implementacion.md) | Arquitectura, roles/privilegios, patrones de diseño, SOLID, endpoints |
| [`docs/01-architecture/flujo-desarrollo.md`](docs/01-architecture/flujo-desarrollo.md) | Orden de construcción por fases (microservicios → MFs) |
| [`docs/01-architecture/base-datos.md`](docs/01-architecture/base-datos.md) | Schema-per-service, entidades y relaciones |
| [`docs/01-architecture/decisions/`](docs/01-architecture/decisions/) | ADRs — decisiones de arquitectura, una por archivo |
| [`docs/03-runbooks/ejecutar-proyecto.md`](docs/03-runbooks/ejecutar-proyecto.md) | Cómo levantar el proyecto |
| [`docs/00-overview/consideraciones-generales.md`](docs/00-overview/consideraciones-generales.md) | Alcance y mejoras opcionales |
| [`docs/04-product/historias-de-usuario.md`](docs/04-product/historias-de-usuario.md) | Historias de usuario por rol |
| [`docs/04-product/roles-y-cobertura.md`](docs/04-product/roles-y-cobertura.md) | Qué historia de usuario cubre cada pantalla, con estado real en código |
| [`docs/04-product/manual-roles-y-flujo-qa.md`](docs/04-product/manual-roles-y-flujo-qa.md) | Guía de prueba manual por rol, paso a paso, y recorrido de punta a punta del flujo de contratos (también disponible en `/manual` con el sistema corriendo) |
| [`ALEXA/README.md`](ALEXA/README.md) | Integración adicional: Alexa Skill de reportes ejecutivos por voz |

---

## Estrategia de ramas

| Rama | Propósito |
|---|---|
| `main` | Producción estable. Solo merges desde `release/*`. |
| `dev` | Integración del equipo. Base de todas las features. |
| `qa` | Pruebas. Se sincroniza desde `dev`. |
| `release/x.y.z` | Estabilización previa a producción. |
| `feature/*` | Ej: `feature/solicitudes-create-form`. |
| `fix/*` | Ej: `fix/sla-calculation-overflow`. |
| `docs/*` | Ej: `docs/swagger-workflow`. |

Todo cambio a `dev` pasa por Pull Request con revisión de al menos un compañero.

## Convención de commits

**Conventional Commits**, validados por `commitlint` + Husky (hook `commit-msg`):

```
<tipo>(<scope>): <descripción corta>
```

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

```
feat(contracts): agregar endpoint POST /contracts
fix(workflow): corregir cálculo de SLA cuando enteredAt es null
docs(api): documentar endpoints de firmas en Swagger
```

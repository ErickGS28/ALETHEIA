# Cómo ejecutar ALETHEIA — Guía para el equipo

> Sistema CLM (Contract Lifecycle Management). Monorepo Turborepo + pnpm con 8 frontends Next.js (web-shell + 7 microfrontends) y 5 servicios NestJS (gateway + 4 microservicios).

---

## Requisitos previos

Instala estas herramientas antes de empezar:

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| **Node.js** | 22 LTS | https://nodejs.org (usa `nvm` o `fnm` si manejas varias versiones) |
| **pnpm** | 10.8.1 | `npm install -g pnpm@10.8.1` o `corepack enable && corepack prepare pnpm@10.8.1 --activate` |
| **Docker Desktop** | reciente | https://www.docker.com/products/docker-desktop — necesario para el backend (PostgreSQL + Redis) |
| **Git** | cualquiera | https://git-scm.com |

Verifica con:

```powershell
node --version   # >= 22.x
pnpm --version   # 10.8.1
docker --version # cualquier versión reciente
```

> ⚠️ **Docker Desktop debe estar ABIERTO** (el daemon corriendo), no solo instalado. Si `docker ps` da un error de "cannot connect to the Docker daemon", abre la app Docker Desktop y espera a que diga *Running*.

---

## Paso 1 — Clonar e instalar

```powershell
git clone <url-del-repo> ALETHEIA
cd ALETHEIA
pnpm install
```

`pnpm install` instala las dependencias de **todas** las apps del workspace de una sola pasada.

> **Importante:** ejecuta siempre los comandos desde la raíz `ALETHEIA/`, nunca desde una subcarpeta. Husky y Turborepo dependen de estar en la raíz.

---

## Paso 2 — Variables de entorno (solo para el backend)

Cada servicio backend (gateway + 4 microservicios) usa su propio archivo `.env`. Están en
`.gitignore`, así que **un clon nuevo no los trae**. Genéralos de una vez desde los `.env.example`
(ya traen los valores por defecto que coinciden con Docker):

```powershell
pnpm setup:env
```

Esto crea 5 archivos `.env` (uno por servicio) sin sobrescribir los que ya existan. No necesitas
editar nada para desarrollo local; los `JWT_SECRET` solo deben cambiarse si vas a exponer el backend.

> Si solo vas a revisar el **frontend** (Opción A), puedes saltarte este paso.

---

## Paso 3 — Elegir qué levantar

### Opción A — Solo el frontend (sin Docker)

Útil para revisar la UI pública y el diseño rápidamente.

```powershell
pnpm dev:fe
```

Levanta 8 procesos Next.js en paralelo:

| App | Puerto | Ruta de entrada |
|---|---|---|
| `web-shell` (host principal) | 4000 | http://localhost:4000 |
| `solicitudes-mf` | 4001 | http://localhost:4000/solicitudes |
| `contratos-mf` | 4002 | http://localhost:4000/contratos |
| `documentos-mf` | 4003 | http://localhost:4000/documentos |
| `flujo-mf` | 4004 | http://localhost:4000/flujo |
| `firmas-mf` | 4005 | http://localhost:4000/firmas |
| `reportes-mf` | 4006 | http://localhost:4000/reportes |
| `admin-mf` | 4007 | http://localhost:4000/admin |

**Entra siempre por http://localhost:4000** — el host reescribe las rutas a cada microfrontend.

> ℹ️ Sin backend podrás ver las páginas **públicas** (`/landing`, `/como-funciona`, `/componentes`)
> y la pantalla de login, pero **el login usa el backend real**: para iniciar sesión y recorrer los
> módulos necesitas levantar el backend (Opción B o C).

---

### Opción B — Core (frontend + backend mínimo) — recomendada en laptop

Levanta gateway + `auth-service` + `contracts-service` + `workflow-service` + `web-shell` + `solicitudes-mf` + `flujo-mf`.

Con **Docker Desktop abierto**:

```powershell
pnpm infra:up     # arranca postgres:5432 + redis:6379
pnpm db:migrate   # aplica las migraciones Prisma de los 4 servicios
pnpm db:seed      # 5 usuarios, privilegios, catálogos y etapas del flujo
pnpm dev:core
```

Verifica la infraestructura: `docker ps` debe mostrar `aletheia_postgres` y `aletheia_redis` como `Up (healthy)`.

---

### Opción C — Sistema completo

Todos los servicios y microfrontends (~15 procesos). Requiere Docker y una laptop con buena RAM.

```powershell
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

> `db:migrate` y `db:seed` recorren **todos** los servicios automáticamente, así que el comando es el
> mismo para la Opción B y la C.

---

## Paso 4 — Verificar que todo funciona

### Frontend

1. Abre http://localhost:4000 → pantalla de login.
2. Página pública que explica el sistema: **http://localhost:4000/como-funciona** (flujo por rol + matriz de permisos).
3. Inicia sesión con una cuenta demo (requiere backend, Opción B/C) y recorre el módulo de tu rol.

### Backend

| Recurso | URL |
|---|---|
| Swagger (documentación API) | **http://localhost:3001/api/docs** |
| Gateway (API REST) | **http://localhost:3001** |

> El gateway corre en el puerto **3001** (no 3000) a propósito, para no chocar con Grafana.

Prueba el login real desde Swagger:

```
POST /auth/login
{ "email": "admin@aletheia.com", "password": "password123" }
```

Respuesta esperada: `{ data: { accessToken, refreshToken, privileges[] } }`.

---

## Cuentas demo (contraseña `password123`)

| Email | Rol |
|---|---|
| `admin@aletheia.com` | Administrador |
| `solicitante@aletheia.com` | Solicitante |
| `abogado@aletheia.com` | Abogado |
| `aprobador@aletheia.com` | Aprobador |
| `firmante@aletheia.com` | Firmante |

Recorrido sugerido: **Solicitante** crea y envía una solicitud → **Administrador** la revisa en *Flujo* → **Abogado** → **Aprobador** → **Firmante** la firma. Verás los toasts y los cambios de estado en vivo.

---

## Comandos de referencia rápida

| Comando | Qué hace |
|---|---|
| `pnpm install` | Instala dependencias de todo el workspace |
| `pnpm setup:env` | Crea los `.env` de los 5 servicios desde sus `.env.example` |
| `pnpm dev:fe` | Solo los 8 frontends (host + 7 MFs) — sin Docker |
| `pnpm dev:core` | Subset funcional: gateway + 3 servicios + 3 frontends |
| `pnpm dev` | Todo el sistema (~15 procesos) |
| `pnpm infra:up` / `pnpm infra:down` | Levanta / apaga postgres + redis (Docker) |
| `pnpm db:migrate` | Migraciones Prisma de todos los servicios |
| `pnpm db:seed` | Seed inicial (usuarios, privilegios, catálogos, etapas) |
| `pnpm build` | Build de producción de todo el monorepo |
| `pnpm lint` | Lint con Biome |

Para correr **una sola app**:

```powershell
pnpm --filter web-shell dev
pnpm --filter solicitudes-mf dev
pnpm --filter @aletheia/gateway dev
```

---

## Estructura del proyecto (referencia rápida)

```
ALETHEIA/
├─ apps/
│  ├─ backend/
│  │  ├─ gateway/              # API Gateway (:3001): punto único HTTP/REST + Swagger + JWT
│  │  ├─ services/
│  │  │  ├─ auth-service/      # Login, refresh token, roles y privilegios
│  │  │  ├─ contracts-service/ # CRUD contratos, plantillas, folio
│  │  │  ├─ workflow-service/  # Estado del contrato, SLA, transiciones
│  │  │  └─ documents-service/ # Carga, versionado y vigencia de documentos
│  │  └─ commons/              # Guards JWT, filtros, patrones Redis compartidos
│  └─ frontend/
│     ├─ web-shell/            # Host Multi-Zones (:4000): login + dashboard RBAC + /como-funciona
│     ├─ microfrontends/       # solicitudes, contratos, documentos, flujo, firmas, reportes, admin
│     └─ commons/              # Design system Neobrutalism + RBAC + toasts compartidos
├─ packages/shared-schemas/    # Tipos TypeScript compartidos front↔back
├─ infra/docker/compose/       # docker-compose.dev.yml (postgres + redis)
├─ scripts/                    # setup-env.mjs, seed-demo.mjs
└─ docs/                       # Documentación, ADRs, runbooks, changelog
```

---

## Solución de problemas frecuentes

**`docker ps` falla / `cannot connect to the Docker daemon`**
Docker Desktop no está corriendo. Ábrelo y espera a que diga *Running*; luego repite `pnpm infra:up`.

**`prepare: .git can't be found` al instalar**
Ejecutas `pnpm install` desde una subcarpeta. Ve a la raíz `ALETHEIA/` y vuelve a intentarlo.

**El login no funciona / "No se pudo conectar con el servidor"**
Levantaste solo el frontend (Opción A) o el backend no está arriba. Usa la Opción B/C y confirma que
el gateway responde en http://localhost:3001/api/docs.

**Puerto ocupado (EADDRINUSE)**
```powershell
netstat -ano | findstr :4000   # reemplaza 4000 por el puerto afectado (3001, 5432, 6379…)
taskkill /PID <pid> /F
```

**El gateway devuelve 503/504**
Redis no está corriendo. Verifica con `docker ps` y si hace falta: `pnpm infra:up`.

**Errores de Prisma / "schema no existe"**
Corre `pnpm db:migrate` para que cada servicio cree su schema lógico en PostgreSQL.

**Los MFs devuelven 404 en su puerto directo**
Comportamiento esperado. Cada MF se monta bajo su `basePath` (p. ej. `/solicitudes`). Entra siempre por el host en http://localhost:4000.

**`turbo` solo levanta `web-shell` y no los MFs (Windows)**
No uses `--filter='*-mf'` en Windows. Usa el script `dev:fe` del `package.json` raíz que ya lista cada filtro explícitamente.

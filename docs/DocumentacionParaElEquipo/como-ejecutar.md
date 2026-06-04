# Cómo ejecutar ALETHEIA — Guía para el equipo

> Sistema CLM (Contract Lifecycle Management). Monorepo Turborepo + pnpm con 8 frontends Next.js (web-shell + 7 microfrontends) y 5 servicios NestJS (gateway + 4 microservicios).

---

## Requisitos previos

Instala estas herramientas antes de empezar:

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| **Node.js** | 22 LTS | https://nodejs.org (usa `nvm` o `fnm` si manejas varias versiones) |
| **pnpm** | 10.8.1 | `npm install -g pnpm@10.8.1` o `corepack enable && corepack prepare pnpm@10.8.1 --activate` |
| **Docker Desktop** | reciente | https://www.docker.com/products/docker-desktop — solo necesario para el backend (PostgreSQL + Redis) |
| **Git** | cualquiera | https://git-scm.com |

Verifica con:

```powershell
node --version   # >= 22.x
pnpm --version   # 10.8.1
docker --version # cualquier versión reciente
```

---

## Paso 1 — Clonar e instalar

```powershell
git clone <url-del-repo> ALETHEIA
cd ALETHEIA
pnpm install
```

`pnpm install` instala las dependencias de **todas** las apps del workspace de una sola pasada. Tarda ~1 minuto la primera vez.

> **Importante:** ejecuta siempre los comandos desde la raíz `ALETHEIA/`, nunca desde una subcarpeta. Husky y Turborepo dependen de estar en la raíz.

---

## Paso 2 — Variables de entorno (solo para el backend)

Si vas a levantar el backend, copia el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Variables clave (los valores por defecto ya coinciden con el `docker-compose.dev.yml`):

```env
DATABASE_URL=postgresql://clm_user:clm_pass@localhost:5432/clm_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=cambia-este-secreto
JWT_REFRESH_SECRET=cambia-este-secreto-refresh
```

> Si solo vas a correr el **frontend (modo mock)**, puedes saltarte este paso.

---

## Paso 3 — Elegir qué levantar

### Opción A — Solo el frontend (modo mock, sin Docker)

**Recomendado para revisar la UI sin necesitar Docker.**

El frontend funciona completamente en modo mock: login por roles, flujos completos de todos los módulos, design system Neobrutalism. No requiere backend activo.

```powershell
pnpm dev:fe
```

Esto levanta 8 procesos Next.js en paralelo (Turborepo):

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

**Entra siempre por http://localhost:4000** — el host reescribe las rutas a cada microfrontend. Cada MF devuelve 404 en su raíz directa porque se monta bajo su `basePath`.

---

### Opción B — Core (frontend + backend mínimo)

Levanta gateway + `auth-service` + `contracts-service` + `workflow-service` + `web-shell` + `solicitudes-mf` + `flujo-mf`.

Primero asegúrate de que Docker Desktop esté corriendo, luego:

```powershell
pnpm infra:up                       # arranca postgres:5432 + redis:6379
pnpm --filter @aletheia/auth-service db:migrate
pnpm --filter @aletheia/contracts-service db:migrate
pnpm --filter @aletheia/workflow-service db:migrate
pnpm db:seed                         # roles, privilegios y catálogos base
pnpm dev:core
```

Verifica la infraestructura:

```powershell
docker ps   # debe mostrar postgres y redis con estado "Up"
```

---

### Opción C — Sistema completo

Todos los servicios y microfrontends (~15 procesos). Requiere Docker y una laptop con buena memoria RAM.

```powershell
pnpm infra:up
# (migraciones igual que Opción B, pero también documents-service)
pnpm --filter @aletheia/documents-service db:migrate
pnpm db:seed
pnpm dev
```

---

## Paso 4 — Verificar que todo funciona

### Frontend (Opciones A/B/C)

1. Abre http://localhost:4000
2. Verás la pantalla de login con 5 botones de rol
3. Haz clic en cualquier rol (p. ej. **Administrador**)
4. Deberías ver el dashboard con las acciones que corresponden a ese rol

### Backend (Opciones B/C)

| Recurso | URL |
|---|---|
| Swagger (documentación API) | http://localhost:3000/api/docs |
| Endpoint de health del gateway | http://localhost:3000 |

Prueba el login real desde Swagger:

```
POST /auth/login
{
  "email": "admin@aletheia.com",
  "password": "password123"
}
```

Respuesta esperada: `{ accessToken, refreshToken, privileges[] }`

---

## Comandos de referencia rápida

| Comando | Qué hace |
|---|---|
| `pnpm install` | Instala dependencias de todo el workspace |
| `pnpm dev:fe` | Solo los 8 frontends (host + 7 MFs) — sin Docker |
| `pnpm dev:core` | Subset funcional: gateway + 3 servicios + 3 frontends |
| `pnpm dev` | Todo el sistema (~15 procesos) |
| `pnpm infra:up` | Levanta postgres + redis (Docker) |
| `pnpm infra:down` | Apaga la infraestructura Docker |
| `pnpm build` | Build de producción de todo el monorepo |
| `pnpm lint` | Lint con Biome |
| `pnpm db:migrate` | Migraciones Prisma de todos los servicios |
| `pnpm db:seed` | Seed inicial (roles, privilegios, catálogos) |

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
│  │  ├─ gateway/              # API Gateway: punto único HTTP/REST + Swagger + JWT
│  │  ├─ services/
│  │  │  ├─ auth-service/      # Login, refresh token, roles y privilegios
│  │  │  ├─ contracts-service/ # CRUD contratos, plantillas, folio
│  │  │  ├─ workflow-service/  # Estado del contrato, SLA, transiciones
│  │  │  └─ documents-service/ # Carga, versionado y vigencia de documentos
│  │  └─ commons/              # Guards JWT, filtros, patrones Redis compartidos
│  └─ frontend/
│     ├─ web-shell/            # Host Multi-Zones: login + dashboard RBAC
│     ├─ microfrontends/
│     │  ├─ solicitudes-mf/    # Crear y gestionar solicitudes de contrato
│     │  ├─ contratos-mf/      # Plantillas y elaboración de contratos
│     │  ├─ documentos-mf/     # Carga y control de documentos requeridos
│     │  ├─ flujo-mf/          # Panel de revisión y aprobación por rol
│     │  ├─ firmas-mf/         # Firma digital (canvas + apoderado)
│     │  ├─ reportes-mf/       # KPIs, filtros y exportar CSV
│     │  └─ admin-mf/          # CRUD usuarios, áreas, configuración de etapas
│     └─ commons/              # Design system Neobrutalism + RBAC compartido
├─ packages/shared-schemas/    # Tipos TypeScript compartidos front↔back
├─ infra/docker/compose/       # docker-compose.dev.yml (postgres + redis)
└─ docs/                       # Documentación, ADRs, runbooks
```

---

## Solución de problemas frecuentes

**`prepare: .git can't be found` al instalar**
Ejecutas `pnpm install` desde una subcarpeta. Ve a la raíz `ALETHEIA/` y vuelve a intentarlo.

**Puerto ocupado (EADDRINUSE)**
Verifica qué ocupa el puerto y mátalo:
```powershell
netstat -ano | findstr :4000   # reemplaza 4000 por el puerto afectado
taskkill /PID <pid> /F
```

**El gateway devuelve 503/504**
Redis no está corriendo. Verifica con `docker ps` y si hace falta: `pnpm infra:up`.

**Errores de Prisma / schema no existe**
Corre `pnpm db:migrate` para que cada servicio cree su schema lógico en PostgreSQL.

**Los MFs devuelven 404 en su puerto directo**
Comportamiento esperado. Cada MF se monta bajo su `basePath` (p. ej. `/solicitudes`). Entra siempre por el host en http://localhost:4000.

**`turbo` solo levanta `web-shell` y no los MFs (Windows)**
No uses `--filter='*-mf'` en Windows — cmd.exe pasa las comillas simples literales. Usa el script `dev:fe` del `package.json` raíz que ya lista cada filtro explícitamente.

---

## Credencial de prueba (backend activo)

| Campo | Valor |
|---|---|
| Email | admin@aletheia.com |
| Contraseña | password123 |
| Rol | Administrador |

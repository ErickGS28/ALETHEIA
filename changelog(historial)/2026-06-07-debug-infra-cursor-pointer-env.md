# Sesión de trabajo — 7 de junio de 2026

## Contexto

El usuario reportó tres problemas: (1) botones sin `cursor-pointer` al hacer hover, (2) las cards de
`/contratos` no navegaban, (3) los flujos por rol no funcionaban correctamente. Al investigar, el
problema raíz era que **el stack completo no levantaba** — los microservicios fallaban al arrancar y
el frontend no tenía backend al que conectarse.

---

## Lo que se hizo

### 1. Script de arranque escalonado — `scripts/dev-staged.mjs`

El comando `turbo dev` intentaba levantar los 12 procesos Node.js simultáneamente, agotando el
archivo de paginación de Windows (`VirtualAlloc failed`, exit code `3221226505`).

**Solución**: nuevo script que arranca los servicios en secuencia con 10–12 s de pausa entre cada uno
y limita el heap V8 a 512 MB por proceso (`NODE_OPTIONS=--max-old-space-size=512`):

```
gateway → (10s) → auth-service → (10s) → contracts-service → (10s) → workflow-service
→ (12s) → [web-shell + solicitudes + contratos + documentos] → (10s) → [flujo + firmas + reportes + admin]
```

- Corrección adicional: `spawn('pnpm', args, {shell: false})` fallaba con `ENOENT` en Windows porque
  `pnpm` es un `.cmd`; se cambió a `spawn('pnpm run dev', {shell: true})`.
- Se añadieron los scripts `dev:be` y `dev:staged` al `package.json` raíz.

### 2. Fix de `cursor-pointer` en commons y módulos

Se añadió `cursor-pointer` + `disabled:cursor-not-allowed` a:

- `apps/frontend/commons/src/ui/button.tsx` — clase base CVA (afecta todos los botones del sistema)
- `admin-mf` — `AdminShell.tsx`: tabs de Usuarios/Roles/Configuración
- `firmas-mf` — `SignatureListView.tsx`: se eliminó `BackButton` y el badge de rol que aparecían
  incorrectamente en esa vista
- `flujo-mf` — `PageShell.tsx`: mismo caso (BackButton + badge de rol eliminados)
- `web-shell` — `RoleLogin.tsx`: botones de acceso rápido demo (Administrador, Solicitante, Abogado,
  Aprobador, Firmante) ahora tienen `cursor-pointer` y `disabled:cursor-not-allowed`

### 3. Diagnóstico y fix de Prisma P1001

Los tres microservicios (auth, contracts, workflow) fallaban con:

```
PrismaClientInitializationError: Can't reach database server at `localhost:5432`
```

**Causa raíz**: en este entorno Windows + WSL2 + Docker Desktop, `localhost` resuelve a `::1`
(IPv6), pero la conexión de Prisma falla con esa dirección aunque PostgreSQL escuche en ambas
interfaces.

**Fix**: todos los archivos `.env` del backend actualizados de `localhost` → `127.0.0.1`:

| Archivo | Cambios |
|---|---|
| `gateway/.env` | `REDIS_HOST` |
| `auth-service/.env` | `DATABASE_URL` + `REDIS_HOST` |
| `contracts-service/.env` | `DATABASE_URL` + `REDIS_HOST` |
| `workflow-service/.env` | `DATABASE_URL` + `REDIS_HOST` |
| `documents-service/.env` | `DATABASE_URL` + `REDIS_HOST` |

### 4. Diagnóstico de Redis UNHEALTHY

El contenedor `aletheia_redis` aparecía como UNHEALTHY y no respondía a comandos (`redis-cli ping`
sin respuesta). Síntoma: conexión TCP aceptada pero sin respuesta a comandos → AOF (Append Only
File) corrupto al cargar.

Docker Desktop quedó bloqueado intentando limpiar el contenedor (bug de Docker Desktop cuando un
contenedor está en estado zombie). Se requiere intervención manual del usuario.

---

## Estado al cerrar la sesión

### Listo (en código)

- `scripts/dev-staged.mjs` — script de arranque escalonado
- `package.json` raíz — scripts `dev:be` y `dev:staged`
- Todos los `.env` del backend con `127.0.0.1`
- `cursor-pointer` en todos los botones interactivos auditados

### Pendiente (requiere acción del usuario)

1. **Reiniciar Docker Desktop** (está congelado):
   - Bandeja del sistema → clic derecho en Docker → Restart
   - Esperar ~30 s a que vuelva a verde

2. **Limpiar y recrear Redis**:
   ```powershell
   cd "C:\ERICK\UTEZ\9NO\DW Integral\Integradora\DocBase\ALETHEIA"
   pnpm infra:down
   docker volume rm aletheia_redis_data
   pnpm infra:up
   ```
   Esperar hasta que ambos contenedores muestren `(healthy)`.

3. **Levantar el stack completo**:
   ```powershell
   pnpm dev:staged
   ```
   El script tarda ~80 s en arrancar todos los servicios en secuencia.

4. **Verificar con Playwright** (auditoría en `C:\Temp\playwright-ale\audit2.mjs`):
   - Flujo de login por los 4 roles
   - Redirección correcta por rol
   - Sidebar visible en cada módulo
   - `cursor-pointer` en todos los botones
   - Cards de `/contratos` que navegan al detalle
   - Ninguna página mostrando error Next.js

5. **Commit de todo lo pendiente**:
   ```
   feat: arranque escalonado (dev-staged) y fix env localhost→127.0.0.1
   fix: cursor-pointer en RoleLogin demo buttons
   ```

---

## Notas técnicas

- **Gateway** corre en `:3001` (no `:3000`).
- **Flujo de auth**: `POST /auth/login` → Zustand store → `useEffect` redirige por rol via
  `window.location.replace()`. Los roles no-ADMIN van a `/solicitudes`, `/flujo` o `/firmas`.
- **Credenciales demo**: contraseña `password123` para todos los usuarios seed.
- **Multi-Zones**: web-shell (`:4000`) proxea a 7 MFs (`:4001`–`:4007`); Next.js Turbopack compila
  páginas en la primera visita (~7–70 s), hay que hacer warm-up antes de auditar.

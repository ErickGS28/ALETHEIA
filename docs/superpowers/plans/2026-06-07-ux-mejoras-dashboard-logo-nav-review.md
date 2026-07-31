# UX/UI Mejoras — Dashboard admin-only, Logo login, Nav performance, Revisión general

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuatro mejoras UX/UI: restringir el dashboard al Administrador + redirección por rol, arreglar visibilidad del logo en login con contenedor circular teal + hover 360°, acelerar navegación entre módulos con Turbopack y barra de progreso, y revisión visual completa del sistema.

**Architecture:** Todos los cambios son exclusivamente en el frontend (web-shell + microfrontends). Sin cambios de backend. La redirección de roles usa `window.location.replace()` porque Multi-Zones requiere full-page reload entre zonas. El contenedor del logo usa `bg-main` (teal) para que la orca blanca sea visible en cualquier contexto. El top-loader se registra en el `RootLayout` del web-shell. Turbopack se habilita en los scripts `dev` de las 8 apps frontend.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, TypeScript, `nextjs-toploader`, `chromium-cli`.

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `apps/frontend/web-shell/src/app/page.tsx` | Redirección por rol + guard admin |
| `apps/frontend/web-shell/src/components/AppSidebar.tsx` | Ocultar "Panel de control" a no-admin |
| `apps/frontend/web-shell/src/features/auth/components/RoleLogin.tsx` | Contenedor circular logo + hover 360° |
| `apps/frontend/web-shell/package.json` | Añadir `nextjs-toploader` + flag `--turbopack` |
| `apps/frontend/web-shell/src/app/layout.tsx` | Agregar `<NextTopLoader>` |
| `apps/frontend/microfrontends/solicitudes-mf/package.json` | Flag `--turbopack` |
| `apps/frontend/microfrontends/flujo-mf/package.json` | Flag `--turbopack` |
| `apps/frontend/microfrontends/contratos-mf/package.json` | Flag `--turbopack` |
| `apps/frontend/microfrontends/documentos-mf/package.json` | Flag `--turbopack` |
| `apps/frontend/microfrontends/firmas-mf/package.json` | Flag `--turbopack` |
| `apps/frontend/microfrontends/reportes-mf/package.json` | Flag `--turbopack` |
| `apps/frontend/microfrontends/admin-mf/package.json` | Flag `--turbopack` |

---

## Task 1: Dashboard exclusivo del Administrador

**Files:**
- Modify: `apps/frontend/web-shell/src/app/page.tsx`
- Modify: `apps/frontend/web-shell/src/components/AppSidebar.tsx`

### Contexto

`page.tsx` muestra `<RoleDashboard />` a cualquier usuario autenticado. `AppSidebar.tsx:189` muestra "Panel de control" sin restricción. Un Firmante que hace login aterriza en el dashboard de admin — experiencia incorrecta.

Lógica de redirección por rol:
- `SOLICITANTE` → `/solicitudes`
- `ABOGADO` → `/flujo`
- `APROBADOR` → `/flujo`
- `FIRMANTE` → `/firmas`

- [ ] **Step 1: Reemplazar `page.tsx` completo**

Reemplaza el contenido de `apps/frontend/web-shell/src/app/page.tsx` con:

```tsx
'use client';

import { AuthSplash, RoleDashboard, RoleLogin, useAuth } from '@/features/auth';
import { useEffect } from 'react';

const ROLE_HOME: Record<string, string> = {
  SOLICITANTE: '/solicitudes',
  ABOGADO: '/flujo',
  APROBADOR: '/flujo',
  FIRMANTE: '/firmas',
};

export default function Home() {
  const { isAuthenticated, hydrated, role } = useAuth();

  useEffect(() => {
    if (hydrated && isAuthenticated && role && role !== 'ADMINISTRADOR') {
      window.location.replace(ROLE_HOME[role] ?? '/solicitudes');
    }
  }, [hydrated, isAuthenticated, role]);

  if (!hydrated) return <AuthSplash />;
  if (!isAuthenticated) return <RoleLogin />;
  if (role !== 'ADMINISTRADOR') return <AuthSplash />;
  return <RoleDashboard />;
}
```

- [ ] **Step 2: Ocultar "Panel de control" en `AppSidebar.tsx` para no-admins**

En `apps/frontend/web-shell/src/components/AppSidebar.tsx`, localiza la sección `{/* Nav */}` (línea ~188). Cambia:

```tsx
        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navLink('/', 'Panel de control', <LayoutDashboard className={ICON} />)}
```

Por:

```tsx
        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {privileges.includes('USERS_MANAGE') &&
            navLink('/', 'Panel de control', <LayoutDashboard className={ICON} />)}
```

- [ ] **Step 3: Typecheck**

```bash
cd "apps/frontend/web-shell" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: cero errores. Si hay errores de tipo, corrígelos antes de continuar.

- [ ] **Step 4: Verificación visual — login como Firmante**

```bash
chromium-cli --session review-task1 <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
screenshot
click button:has-text("Firmante")
wait-for url=localhost:4005
screenshot
console --errors
EOF
```

Esperado: 
- Primera screenshot: pantalla de login.
- Segunda screenshot: el navegador redirigió a `localhost:4005/firmas` (microfrontend de Firmas). NO se ve el dashboard.

- [ ] **Step 5: Verificación visual — login como Administrador**

```bash
chromium-cli --session review-task1-admin <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
screenshot
click button:has-text("Administrador")
wait-for text=Panel de control
screenshot
console --errors
EOF
```

Esperado: segunda screenshot muestra el dashboard con "Panel de control" en el header y el sidebar.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/web-shell/src/app/page.tsx apps/frontend/web-shell/src/components/AppSidebar.tsx
git commit -m "feat(auth): dashboard exclusivo admin — redirección por rol en login"
```

---

## Task 2: Logo en login — contenedor circular teal + hover 360°

**Files:**
- Modify: `apps/frontend/web-shell/src/features/auth/components/RoleLogin.tsx`

### Contexto

La orca es una silueta blanca (PNG con fondo transparente). En móvil, se renderiza sobre `bg-secondary-background` (fondo claro) → invisible. En desktop, aparece sobre `bg-foreground` (oscuro) → visible pero sin contenedor visual.

**Solución:** envolver el logo en un contenedor circular `bg-main` (teal) que hace la orca blanca visible en cualquier contexto + `hover:rotate-[360deg]` con `transition-transform duration-700`.

- [ ] **Step 1: Actualizar logo del panel de marca (desktop)**

En `apps/frontend/web-shell/src/features/auth/components/RoleLogin.tsx`, localiza el bloque del logo desktop:

```tsx
        {/* Logo grande de la orca como protagonista */}
        <div className="relative z-10">
          {/* biome-ignore lint/a11y/useAltText: alt explícito */}
          <img
            src="/logo.png"
            alt="ALETHEIA"
            width={120}
            height={120}
            className="h-28 w-28 object-contain xl:h-32 xl:w-32"
          />
        </div>
```

Reemplázalo con:

```tsx
        {/* Logo grande de la orca como protagonista */}
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center rounded-full bg-main border-2 border-background/20 p-4 transition-transform duration-700 ease-in-out hover:rotate-[360deg] cursor-default shadow-[0_6px_24px_rgba(13,148,136,0.5)]">
            {/* biome-ignore lint/a11y/useAltText: alt explícito */}
            <img
              src="/logo.png"
              alt="ALETHEIA"
              width={112}
              height={112}
              className="h-24 w-24 object-contain xl:h-28 xl:w-28"
            />
          </div>
        </div>
```

- [ ] **Step 2: Actualizar logo de la versión móvil**

En el mismo archivo, localiza el bloque móvil (`xl:hidden`):

```tsx
          {/* Marca en móvil */}
          <div className="mb-8 flex flex-col items-center gap-3 xl:hidden">
            <Logo size={64} variant="mark" />
            <span className="font-heading text-3xl tracking-tight">ALETHEIA</span>
          </div>
```

Reemplázalo con:

```tsx
          {/* Marca en móvil */}
          <div className="mb-8 flex flex-col items-center gap-3 xl:hidden">
            <div className="inline-flex items-center justify-center rounded-full bg-main border-2 border-main/30 p-3 transition-transform duration-700 ease-in-out hover:rotate-[360deg] cursor-default shadow-[0_4px_16px_rgba(13,148,136,0.35)]">
              <Logo size={52} variant="mark" />
            </div>
            <span className="font-heading text-3xl tracking-tight">ALETHEIA</span>
          </div>
```

- [ ] **Step 3: Typecheck**

```bash
cd "apps/frontend/web-shell" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: cero errores.

- [ ] **Step 4: Verificación visual — login desktop**

```bash
chromium-cli --session review-logo <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
screenshot
screenshot-element div.relative.z-10
EOF
```

Esperado: logo visible dentro de un círculo teal en el panel oscuro izquierdo.

- [ ] **Step 5: Verificación hover — simular y capturar**

```bash
chromium-cli --session review-logo-hover <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
eval document.querySelector('img[alt="ALETHEIA"]').closest('.rounded-full').style.transform = 'rotate(360deg)'
screenshot
EOF
```

Esperado: el logo aparece rotado 90°-180° (simulación estática de la animación).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/web-shell/src/features/auth/components/RoleLogin.tsx
git commit -m "feat(login): logo en contenedor circular teal con hover 360deg"
```

---

## Task 3: Turbopack + barra de progreso de navegación

**Files:**
- Modify: `apps/frontend/web-shell/package.json`
- Modify: `apps/frontend/web-shell/src/app/layout.tsx`
- Modify: `apps/frontend/microfrontends/solicitudes-mf/package.json`
- Modify: `apps/frontend/microfrontends/flujo-mf/package.json`
- Modify: `apps/frontend/microfrontends/contratos-mf/package.json`
- Modify: `apps/frontend/microfrontends/documentos-mf/package.json`
- Modify: `apps/frontend/microfrontends/firmas-mf/package.json`
- Modify: `apps/frontend/microfrontends/reportes-mf/package.json`
- Modify: `apps/frontend/microfrontends/admin-mf/package.json`

### Contexto

Multi-Zones fuerza full-page reload en cada navegación cross-zone. En dev, Next.js compila rutas de forma lazy: primera visita = 5–10 s de espera sin feedback visual. Dos fixes: (a) Turbopack acelera la compilación, (b) NextTopLoader muestra una barra de progreso en el top mientras carga.

> **Nota:** si Turbopack falla con algún plugin (ej. Tailwind v4), el fallback es revertir el flag `--turbopack` en ese MF específico. El resto de cambios (toploader) son independientes.

### Parte A — Instalar nextjs-toploader en web-shell

- [ ] **Step 1: Instalar dependencia**

```bash
cd "C:\ERICK\UTEZ\9NO\DW Integral\Integradora\DocBase\ALETHEIA" && pnpm --filter web-shell add nextjs-toploader
```

Esperado: `nextjs-toploader` aparece en `apps/frontend/web-shell/package.json` bajo `dependencies`.

- [ ] **Step 2: Agregar NextTopLoader en layout.tsx**

Edita `apps/frontend/web-shell/src/app/layout.tsx`. Añade el import:

```tsx
import NextTopLoader from 'nextjs-toploader';
```

Y dentro del `<body>`, como primer hijo (antes de `<StoreProvider>`):

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${anton.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <NextTopLoader color="#0d9488" showSpinner={false} height={3} />
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "apps/frontend/web-shell" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: cero errores.

### Parte B — Turbopack en los scripts dev

- [ ] **Step 4: Habilitar Turbopack en web-shell**

En `apps/frontend/web-shell/package.json`, cambia el script `dev`:

```json
"dev": "next dev --port 4000 --turbopack",
```

- [ ] **Step 5: Habilitar Turbopack en los 7 microfrontends**

Edita cada uno de estos archivos y añade `--turbopack` al final de su script `dev`:

`apps/frontend/microfrontends/solicitudes-mf/package.json`:
```json
"dev": "next dev --port 4001 --turbopack",
```

`apps/frontend/microfrontends/contratos-mf/package.json`:
```json
"dev": "next dev --port 4002 --turbopack",
```

`apps/frontend/microfrontends/documentos-mf/package.json`:
```json
"dev": "next dev --port 4003 --turbopack",
```

`apps/frontend/microfrontends/flujo-mf/package.json`:
```json
"dev": "next dev --port 4004 --turbopack",
```

`apps/frontend/microfrontends/firmas-mf/package.json`:
```json
"dev": "next dev --port 4005 --turbopack",
```

`apps/frontend/microfrontends/reportes-mf/package.json`:
```json
"dev": "next dev --port 4006 --turbopack",
```

`apps/frontend/microfrontends/admin-mf/package.json`:
```json
"dev": "next dev --port 4007 --turbopack",
```

- [ ] **Step 6: Matar y reiniciar el dev server con los nuevos flags**

> Los cambios en `package.json` solo tienen efecto al reiniciar los procesos.

```bash
# El proceso dev:core corre en background — finalizarlo:
# En Windows PowerShell:
Get-Process -Name node | Stop-Process -Force 2>$null; Write-Host "Procesos node detenidos"
```

Luego, desde la raíz del monorepo:

```bash
pnpm dev:core
```

Esperar a ver en los logs:
```
web-shell:dev:   ▲ Next.js 15.x (Turbopack)
solicitudes-mf:dev:   ▲ Next.js 15.x (Turbopack)
flujo-mf:dev:   ▲ Next.js 15.x (Turbopack)
```

Si algún MF falla con Turbopack (error de compilación), revertir su script `dev` quitando `--turbopack` solo en ese MF.

- [ ] **Step 7: Verificar barra de progreso**

```bash
chromium-cli --session review-toploader <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
click button:has-text("Administrador")
wait-for text=Panel de control
screenshot
click a[href="/solicitudes"]
screenshot
EOF
```

Esperado: segunda screenshot muestra la barra teal (`#0d9488`) en la parte superior de la página durante la navegación. Nota: la barra es breve; si la compilación es rápida puede no capturarse.

- [ ] **Step 8: Commit**

```bash
git add \
  apps/frontend/web-shell/package.json \
  apps/frontend/web-shell/src/app/layout.tsx \
  apps/frontend/microfrontends/solicitudes-mf/package.json \
  apps/frontend/microfrontends/flujo-mf/package.json \
  apps/frontend/microfrontends/contratos-mf/package.json \
  apps/frontend/microfrontends/documentos-mf/package.json \
  apps/frontend/microfrontends/firmas-mf/package.json \
  apps/frontend/microfrontends/reportes-mf/package.json \
  apps/frontend/microfrontends/admin-mf/package.json
git commit -m "perf(nav): turbopack en todos los MFs + barra de progreso nextjs-toploader"
```

---

## Task 4: Revisión general con chromium-cli — screenshot + fixes

**Files:** según lo que encuentre la revisión (correcciones on-the-fly).

### Alcance de la revisión

1. Login — branding, demo buttons, responsive.
2. Dashboard admin — métricas, módulos accesibles, sidebar.
3. Redirección de roles — cada rol llega al módulo correcto.
4. solicitudes-mf — listado, navegación interna.
5. flujo-mf — panel de revisión, SLA.
6. Swagger — `localhost:3001/api/docs`.
7. Fixes inmediatos de lo que se detecte.

- [ ] **Step 1: Screenshot del login**

```bash
chromium-cli --session full-review <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
screenshot
EOF
```

Evaluar: logo visible, branding correcto, botones demo funcionales, layout equilibrado.

- [ ] **Step 2: Login como admin y revisar dashboard**

```bash
chromium-cli --session full-review <<'EOF'
click button:has-text("Administrador")
wait-for text=Panel de control
screenshot
screenshot-element nav
EOF
```

Evaluar: sidebar muestra "Panel de control" solo a admin, módulos correctos visibles, stats cards con Skeleton placeholder.

- [ ] **Step 3: Revisar módulo solicitudes**

```bash
chromium-cli --session full-review <<'EOF'
click a[href="/solicitudes"]
wait-for text=Solicitudes
screenshot
console --errors
EOF
```

Evaluar: página cargó sin errores de consola, layout correcto.

- [ ] **Step 4: Revisar módulo flujo**

```bash
chromium-cli --session full-review <<'EOF'
nav http://localhost:4000
wait-for text=Panel
click a[href="/flujo"]
wait-for text=Flujo
screenshot
console --errors
EOF
```

- [ ] **Step 5: Login como otros roles — verificar redirección**

```bash
chromium-cli --session review-roles <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
click button:has-text("Solicitante")
wait-for url=localhost:4001
screenshot
EOF
```

```bash
chromium-cli --session review-roles-abogado <<'EOF'
nav http://localhost:4000
wait-for text=Iniciar sesión
click button:has-text("Abogado")
wait-for url=localhost:4004
screenshot
EOF
```

- [ ] **Step 6: Revisar Swagger**

```bash
chromium-cli --session review-swagger <<'EOF'
nav http://localhost:3001/api/docs
wait-for text=ALETHEIA
screenshot
EOF
```

Evaluar: Swagger carga, endpoints visibles, título correcto.

- [ ] **Step 7: Aplicar fixes detectados**

Para cada problema encontrado en los pasos anteriores:
- Identifica el archivo fuente.
- Aplica el fix mínimo necesario.
- Toma screenshot de verificación.
- Commitea con `fix(<scope>): descripción del fix`.

Si no hay problemas críticos: continua al step siguiente.

- [ ] **Step 8: Commit de revisión**

```bash
git add -A
git commit -m "fix(ux): correcciones de revisión general — UX/UI y funcionalidad"
```

Si no hubo fixes: omitir este commit.

---

## Self-review del plan

**Cobertura del spec:**
- ✅ Dashboard admin-only + redirección por rol → Task 1
- ✅ Logo circular + hover 360° → Task 2
- ✅ Turbopack + progress bar → Task 3
- ✅ Revisión general con chromium-cli → Task 4

**Placeholders:** ninguno — cada step tiene código o comando concreto.

**Consistencia de tipos:**
- `role` viene de `useAuth()` → tipo `string | null` (del authSlice). El guard `role !== 'ADMINISTRADOR'` es seguro con string.
- `privileges.includes('USERS_MANAGE')` es `string[]` → correcto.
- `nextjs-toploader` exporta `NextTopLoader` como default export → import correcto.

**Riesgo Turbopack:** si falla en algún MF, revertir `--turbopack` solo en ese MF. El top-loader es completamente independiente y no tiene riesgo.

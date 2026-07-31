# Spec: UX/UI Mejoras — Dashboard admin-only, Logo, Navegación, Revisión general

**Fecha:** 2026-06-07  
**Rama:** `feature/restructure-microservices`  
**Prioridad:** Alta — afecta la demo del sistema completo

---

## 1. Contexto

Cuatro problemas detectados en revisión de la sesión actual:

1. El "Panel de control" (dashboard) es visible para todos los roles, cuando debería ser exclusivo del Administrador.
2. El logo de la orca en el login es una silueta blanca que se pierde cuando el fondo es claro (móvil).
3. La navegación entre módulos tarda 5–10 s en modo dev porque Multi-Zones usa full-page reload + compilación lazy de Next.js.
4. Necesita una revisión integral de UX/UI y funcionalidad para asegurar que el sistema esté al 100%.

---

## 2. Cambio 1 — Dashboard exclusivo del Administrador

### Problema
`apps/frontend/web-shell/src/app/page.tsx` muestra `<RoleDashboard />` a cualquier usuario autenticado.  
`AppSidebar.tsx:189` incluye "Panel de control" sin restricción de privilegio.

### Solución
**a) Redirección en `page.tsx`**  
- Si `role === 'ADMINISTRADOR'` → renderiza `<RoleDashboard />`  
- Para cualquier otro rol → redirige al módulo primario con `window.location.replace()`:
  - `SOLICITANTE` → `/solicitudes`
  - `ABOGADO` → `/flujo`
  - `APROBADOR` → `/flujo`
  - `FIRMANTE` → `/firmas`
- Si `hydrated` pero `!isAuthenticated` → `<RoleLogin />`

**b) Sidebar (`AppSidebar.tsx`)**  
El nav item "Panel de control" (`href="/"`) se agrega `requires: ['USERS_MANAGE']` para que solo lo vea el Administrador. Se mueve dentro del mecanismo `canSee` existente.

**Archivos afectados:**
- `apps/frontend/web-shell/src/app/page.tsx`
- `apps/frontend/web-shell/src/components/AppSidebar.tsx`

---

## 3. Cambio 2 — Logo en login: contenedor circular + hover 360°

### Problema
`RoleLogin.tsx` (desktop): `<img src="/logo.png">` sobre `bg-foreground` (oscuro) — correcto, debería verse.  
`RoleLogin.tsx` (móvil, `xl:hidden`): `<Logo size={64} variant="mark">` sobre `bg-secondary-background` (claro) — orca blanca invisible.

### Solución
En ambas instancias del logo en `RoleLogin.tsx`, envolver en un contenedor circular:

```tsx
<div
  className="rounded-full bg-foreground border-2 border-main p-3
             transition-transform duration-700 ease-in-out
             hover:rotate-[360deg] cursor-default"
  style={{ boxShadow: '0 4px 18px rgba(13,148,136,0.25)' }}
>
  <img src="/logo.png" ... />
</div>
```

- `bg-foreground` = el fondo oscuro (teal/negro) que hace visible la orca blanca en cualquier contexto.
- `border-main` = borde teal de marca.
- `hover:rotate-[360deg] duration-700` = rotación 360° suave al hacer hover (CSS transform).
- Tamaño: `h-20 w-20 p-3` en desktop, `h-16 w-16 p-2.5` en móvil.

**Archivos afectados:**
- `apps/frontend/web-shell/src/features/auth/components/RoleLogin.tsx`

---

## 4. Cambio 3 — Navegación más rápida entre módulos

### Causa raíz
- Multi-Zones requiere full-page reload entre zonas (correcto por diseño).
- En dev, Next.js compila rutas on-demand: primera visita = 5–10 s invisible.
- El sidebar usa `<a href>` (no `<Link>`), correcto para cross-zone, pero sin feedback visual.

### Solución

**a) Turbopack en scripts dev de los MFs y web-shell**  
Agregar `--turbopack` al flag `next dev` en todos los `package.json` de las apps frontend.  
Efecto: compilación ~10× más rápida en dev.

**b) Barra de progreso visual (top-loader)**  
Instalar `nextjs-toploader` en web-shell y aplicarlo en `layout.tsx`.  
Dado que el shell se recarga completamente en cada navegación cross-zone, el top-loader se activa en cada `DOMContentLoaded` y da feedback visual inmediato al usuario.

**c) Prefetch DNS/TCP**  
Agregar `<link rel="prefetch">` para los orígenes de los MFs en el `<head>` del layout del web-shell.

**Archivos afectados:**
- `apps/frontend/web-shell/package.json` (devDep `nextjs-toploader`, script dev)
- `apps/frontend/web-shell/src/app/layout.tsx`
- `apps/frontend/microfrontends/*/package.json` (flag `--turbopack`)

---

## 5. Cambio 4 — Revisión general con chromium-cli

### Alcance
Revisión viva del sistema completo con capturas de pantalla:
- Flujo de login (todos los roles).
- Dashboard admin vs redirección de otros roles.
- Navegación del sidebar (módulos visibles por privilegio).
- Módulos core: solicitudes-mf, flujo-mf.
- Swagger en `localhost:3001/api/docs`.

Correcciones aplicadas on-the-fly según lo que se detecte (texto incorrecto, estados rotos, elementos desalineados, lógica faltante).

---

## 6. Criterios de éxito

- [ ] Un usuario con rol `FIRMANTE` que hace login aterriza en `/firmas`, nunca en `/`.
- [ ] El sidebar del Firmante NO muestra "Panel de control".
- [ ] El logo de la orca es visible sobre cualquier fondo en el login.
- [ ] El logo hace una rotación 360° al hacer hover.
- [ ] La compilación inicial de un MF en dev tarda < 3 s con Turbopack.
- [ ] Hay una barra de progreso visible al navegar entre módulos.
- [ ] La revisión general no detecta errores críticos de UX o lógica sin resolver.

---

## 7. Fuera de alcance

- Conectar las métricas del dashboard al backend (quedan como Skeleton placeholder).
- Cambios en los microservicios backend.
- Traducción / i18n.

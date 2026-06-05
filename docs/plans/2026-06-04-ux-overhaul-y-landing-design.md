# Diseño — Overhaul de Usabilidad/UX + Landing Educativa

**Fecha:** 2026-06-04 · **Branch:** `feature/restructure-microservices` · **Estado:** aprobado

## Objetivo

1. Dejar cada sección de la app (7 microfrontends + web-shell) **usable y amigable** tanto visual como funcionalmente.
2. Crear una **landing educativa en ruta pública** (`/como-funciona`) que explique el flujo de los contratos por cada fase y rol, y los permisos de cada uno.

Verificación acordada: **build + typecheck + lint** (sin levantar el stack completo).

## Diagnóstico (auditoría de 68 hallazgos, 9 módulos)

Base sólida (design system tokenizado, RBAC, estados base en commons). 7 problemas transversales:

1. 🔴 **Sin sistema de toasts** → ninguna acción confirma éxito/error visiblemente.
2. 🔴 **Colores hardcodeados** (`#15a8b5`, `text-red-600`, `bg-red-100`, hex SLA) en vez de tokens.
3. 🔴 **Cargas con texto plano** en vez de `LoadingState`/`Skeleton`.
4. 🟡 **Errores sin reintento** / estilo inconsistente.
5. 🟡 **Formularios sin marca de obligatorio** ni props `required`/`error` en primitivos.
6. 🟡 **Accesibilidad**: iconos sin `aria-label`, SLA solo color, canvas sin label, filas no navegables por teclado.
7. 🟡 **Responsive**: inputs de ancho fijo, tablas sin wrapper scroll, breakpoint del login, toolbar del editor.

Bugs puntuales: botones "Solicitar demo" muertos; en flujo el **modal se cierra al fallar ocultando el error**; `window.confirm()` en contratos; bitácora muestra `Usuario #123`; enums crudos en pantalla.

## Decisiones

- **Toasts:** componente custom en `commons` (sin dependencia nueva), estilo Neobrutalism, montado en el layout de cada app vía `<Toaster/>` + hook `useToast()`.
- **Ejecución del pulido:** agentes en paralelo, uno por módulo (directorios distintos → sin conflictos), tras completar la fundación en commons.
- **Landing:** nueva ruta `/como-funciona` con pipeline visual de fases + matriz de permisos.

## Plan

### Fase 1 — Fundación en `commons` (secuencial, con cuidado)
- `Toaster` + `useToast` (contexto + portal).
- Props `required`/`error`/`aria-invalid` en `Input`/`Textarea`/`Select` + componente `FormField`.
- Helpers canónicos tokenizados: `contractStatusLabel`, `StatusBadge`, `SlaIndicator` (color **y** texto).
- `Button` variante `reverse` con sombra a token; `DropdownMenuItem` variante destructiva; `Modal` con `allowBackdropClose`.

### Fase 2 — Pulido por módulo (paralelo: shell + 7 MFs)
Cada agente, con guía de estilo común: toasts éxito/error, tokens en vez de colores hardcodeados, `LoadingState`/`Skeleton`, reintento en errores, marcas de obligatorio, fixes responsive, a11y, microcopy (traducir enums), bugs puntuales. Cablear KPIs del dashboard al endpoint de reportes con estados de carga/vacío.

### Fase 3 — Landing `/como-funciona`
Pipeline de estados (DRAFT→…→SIGNED + ramas reject/cancel/recover), acciones por rol y fase, matriz de permisos. Enlazada desde `/landing` y login.

### Fase 4 — Verificación
`turbo build` + typecheck + lint del frontend; corregir errores.

## Riesgos
- Multi-Zones: cada app es un árbol React independiente → `<Toaster/>` se monta por app.
- Paralelismo: los agentes solo tocan su MF; `commons` se congela antes de la Fase 2.

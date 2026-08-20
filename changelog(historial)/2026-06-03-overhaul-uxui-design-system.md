# Sesión de trabajo — 3 de junio de 2026

## Contexto

Revisión **integral de UX/UI y navegación** de todo el frontend (web-shell + 7 microfrontends).
Objetivo: experiencia moderna, consistente y profesional sin romper funcionalidad. Se partió de
una auditoría previa de 7 dimensiones (design system, primitivos, navegación, consistencia entre
MFs, editor, branding, responsive) y se ejecutó en fases verificadas.

> Decisiones de diseño confirmadas con el equipo: **Neobrutalism pulido** (se conservan bordes 2px
> y sombras duras, se corrigen grises/jerarquía/espaciado) y **acento secundario coral `#FB6A55`**
> complementario al teal de marca.

---

## Lo que se hizo

### 1. Fundación del design system (`commons/src/styles/tokens.css`)
- Corregido el tamaño de fuente base (estaba en ~30px → ahora raíz 16px, body 1rem/1.6).
- Acento **coral** + escala de grises semántica (`muted-foreground`) + tokens de estado
  (`destructive/success/warning/info`) + elevaciones (`shadow-sm/lg`).

### 2. Primitivos compartidos nuevos (commons) y fin de la duplicación
- 14 primitivos: **Logo, Spinner, Button (`isLoading`), Label, Textarea, Select, Skeleton, Modal,
  ConfirmDialog, states, BackButton, PageHeader, PageShell**.
- Migrados los 7 MFs a commons y **eliminados 18 archivos duplicados** (Select ×6, Modal ×3,
  Textarea ×3, Label, states).

### 3. Bug de navegación (flash de login al volver de un MF)
- Causa raíz: auth 100% cliente que renderizaba antes de hidratar la sesión.
- Solución: flag `hydrated` + `<AuthSplash>` en el host y flag `ready` en `useRole`/`PrivilegeGuard`
  para los MFs. Sin parpadeos ni redirecciones incorrectas.

### 4. Branding
- Corregido el casing del logo (`Logo.png → logo.png`) que daba **404 en Linux/Vercel**.
- Logo + favicon distribuidos a las 8 apps; componente `<Logo/>` compartido. Eliminado el
  placeholder "A".

### 5. Login, dashboard y sidebar
- **Login** split-screen con la orca grande como protagonista, responsive.
- **Sidebar** profesional con logo real, gateo por privilegio y **drawer en móvil**.

### 6. Editor de plantillas/contratos
- **Sistema de variables `{{...}}`** como píldoras (nodo TipTap) + catálogo insertable.
- Toolbar **sticky agrupada** (menú "Más opciones"), **lienzo tipo hoja** (WYSIWYG real),
  popover inline para enlaces/imágenes (reemplaza `window.prompt`).

### 7. Responsive
- Sidebar con drawer, tablas anchas con `overflow-x-auto` + `min-w`, modales con scroll,
  padding por breakpoint (`p-4 sm:p-6`).

---

## Verificación
- **Typecheck de las 8 apps: EXIT 0.** Biome limpio. Dev server HTTP 200; el SSR renderiza el
  splash en lugar del flash de login.

## Commits
- `feat: fundación del design system, branding real y fix del flash de navegación`
- `refactor: migra los 7 microfrontends a los primitivos canónicos de commons`
- `feat: rediseña el editor de contratos (toolbar agrupada, lienzo tipo hoja y variables)`

## Deuda técnica detectada (para después)
- Faltan **Switch** y **Tabs** en commons (siguen locales en algunos MFs).
- `contratos-mf` conserva su `Label` local (look uppercase) pendiente de unificar.
- Las variables se muestran como chips pero **aún no se resuelven con datos reales** al imprimir/PDF.
- Layout 3-zonas del editor (panel lateral de configuración de página) queda como mejora futura.
- Recomendable una regla de lint que prohíba primitivos UI locales que dupliquen commons.

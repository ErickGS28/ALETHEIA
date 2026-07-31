# Sesión de trabajo — 28 de mayo de 2026

## Contexto

Segunda sesión de trabajo del proyecto. Se partió del documento `1.Implementacion.md` como fuente de verdad y del changelog del 25 de mayo como base de contexto. El objetivo del día fue crear la estructura real del monorepo y dejarlo funcional para desarrollo.

---

## Lo que se trabajó hoy

### 1. Inicialización del monorepo `clm-system/`

Se creó el monorepo completo en la raíz del proyecto con la siguiente estructura base:

```
clm-system/
├── package.json              ← raíz del workspace (pnpm 10.8.1)
├── pnpm-workspace.yaml       ← define apps/* y packages/*
├── turbo.json                ← pipelines: build, dev, lint, test, db:generate
├── tsconfig.base.json        ← configuración TypeScript compartida
├── biome.json                ← linter/formatter unificado (reemplaza ESLint + Prettier)
├── commitlint.config.cjs     ← Conventional Commits con scopes del proyecto
├── .husky/                   ← pre-commit (biome) + commit-msg (commitlint)
├── apps/
│   ├── backend/
│   └── frontend/web-shell/
├── packages/shared-schemas/  ← tipos TS compartidos frontend ↔ backend
└── infra/docker/compose/     ← docker-compose.dev.yml (solo postgres)
```

**Stack definido y confirmado:**
- Gestor de paquetes: **pnpm workspaces**
- Build orchestrator: **Turborepo**
- Linting/formato: **Biome** (un solo binario, reemplaza ESLint + Prettier)
- Commits: **Conventional Commits** + Commitlint + Husky

---

### 2. Inicialización del backend — `apps/backend/`

Backend NestJS con todos los módulos del sistema creados. Se tomó como referencia el proyecto `service-template-v2` (que usa TypeORM + MySQL) pero se migró a **Prisma + PostgreSQL**.

**Tecnologías:**
- NestJS v11
- Prisma ORM v6 (reemplaza TypeORM)
- PostgreSQL (reemplaza MySQL)
- `@nestjs/swagger` — documentación en `/api/docs`
- `@nestjs/jwt` + `passport-jwt` — autenticación JWT
- `class-validator` + `class-transformer` — validación de DTOs

**Lo que se creó:**

- `src/main.ts` — configura ValidationPipe global, GlobalExceptionFilter, TransformInterceptor, Swagger en `/api/docs`, CORS para localhost:4000
- `src/app.module.ts` — registra todos los módulos
- `src/prisma/` — `PrismaService` + `PrismaModule` marcado como `@Global()`
- `src/common/filters/http-exception.filter.ts` — `GlobalExceptionFilter` (formato uniforme de errores con `statusCode`, `message`, `path`, `timestamp`)
- `src/common/interceptors/transform.interceptor.ts` — envuelve todas las respuestas en `{ data, statusCode, message }`
- `src/auth/` — módulo completo:
  - `AuthController`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
  - `AuthService`: login con bcryptjs, generación de accessToken (15m) + refreshToken (7d), invalidación en BD al logout
  - `JwtStrategy`: extrae token del header `Authorization: Bearer`
  - `JwtAuthGuard`: respeta el decorador `@Public()`
  - `PrivilegeGuard`: verifica `user.privileges.includes(required)` — patrón `@RequirePrivilege('CONTRACT_CREATE')`
  - Decoradores: `@Public()`, `@RequirePrivilege()`, `@CurrentUser()`
- **8 módulos stub** (contenido vacío listo para implementar en Sprint 2): `users`, `contracts`, `documents`, `workflow`, `signatures`, `notifications`, `reports`, `catalogs`

**Prisma schema (`prisma/schema.prisma`):**

Schema completo con todos los modelos del sistema:
`User`, `RefreshToken`, `Society`, `Area`, `Template`, `Contract`, `WorkflowStage`, `ContractWorkflow`, `Document`, `Signature`, `Notification`, `AuditLog`

Incluye los campos detectados en la sesión anterior como faltantes: `RefreshToken` (para logout real), `vendorName` + `title` en `Contract`, `isActive` en `Society` y `Area`, relación `Notification → Contract`.

**Para levantar el backend:**
```bash
cd clm-system
cp apps/backend/.env.example apps/backend/.env
# levantar postgres
docker compose -f infra/docker/compose/docker-compose.dev.yml up -d
# instalar dependencias y migrar
pnpm install
cd apps/backend && pnpm db:generate && pnpm db:migrate && pnpm dev
# API en http://localhost:3000 · Swagger en http://localhost:3000/api/docs
```

---

### 3. Inicialización del frontend — `apps/frontend/web-shell/`

App Shell en Next.js 15 con Tailwind CSS v4 y la librería de componentes **Neobrutalism** (basada en shadcn/ui).

**Tecnologías:**
- Next.js 15.5 (App Router)
- React 19
- **Tailwind CSS v4** — configuración CSS-first (sin `tailwind.config.ts`)
- `@tailwindcss/postcss` — plugin PostCSS para v4
- **Neobrutalism** — variante de shadcn/ui con estética brutalista
- `tw-animate-css` — animaciones CSS compatibles con Tailwind v4
- `@tanstack/react-table` — data table con sorting, filtering, paginación
- `@radix-ui/react-slot`, `@radix-ui/react-checkbox`, `@radix-ui/react-dropdown-menu`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react` — iconos

**Configuración de Tailwind v4 + Neobrutalism:**

En lugar de `tailwind.config.ts`, toda la configuración vive en `globals.css` mediante `@theme inline`:

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  /* Colores del sistema ALETHEIA */
  --color-main:               #15A8B5;   /* teal — color de marca */
  --color-main-foreground:    #ffffff;
  --color-background:         #ffffff;
  --color-foreground:         #000000;
  --color-secondary-background: #e8e8e8;
  --color-border:             #000000;
  --color-shadow:             #000000;

  /* Neobrutalism: borde negro grueso + sombra offset */
  --radius-base: 5px;
  --shadow-shadow: 4px 4px 0px 0px var(--color-shadow);

  /* Font weights como utilities (font-base, font-heading) */
  --font-weight-base:    600;
  --font-weight-heading: 900;

  /* Tipografía */
  --font-sans: var(--font-barlow, 'Barlow Condensed', sans-serif);
  --font-mono: var(--font-ibm, 'IBM Plex Mono', monospace);
}
```

Esto genera automáticamente las utilities `bg-main`, `text-main`, `shadow-shadow`, `rounded-base`, `font-base`, `font-heading`.

**Fuentes (via `next/font/google`):**
- **Barlow Condensed** (weights 400–900, regular + italic) — títulos y UI. Font condensada, impactante, neobrutalist
- **IBM Plex Mono** (weights 400/500/700) — párrafos, datos técnicos, IDs de contratos. El look monospace refuerza la estética de "documento/contrato"

**Componentes creados (neobrutalism):**

| Componente | Archivo | Notas |
|---|---|---|
| `Button` | `components/ui/button.tsx` | 8 variantes: `default`, `neutral`, `outline`, `secondary`, `destructive`, `ghost`, `link`, `reverse`, `noShadow` |
| `Card` | `components/ui/card.tsx` | Con `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Badge` | `components/ui/badge.tsx` | 5 variantes: `default`, `secondary`, `destructive`, `neutral`, `outline` |
| `Input` | `components/ui/input.tsx` | Monospace, border-2, shadow-shadow |
| `Table` | `components/ui/table.tsx` | `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` |
| `Checkbox` | `components/ui/checkbox.tsx` | Square (rounded-none), teal al activarse |
| `DropdownMenu` | `components/ui/dropdown-menu.tsx` | Completo con separadores, labels, items |

**Data Table (`components/data-table.tsx`):**
Tabla de contratos CLM funcional con:
- 7 contratos de ejemplo con datos reales del dominio
- Sorting por proveedor (toggle asc/desc)
- Filtrado en tiempo real por proveedor
- Selección de filas con checkbox
- Toggle de columnas visibles
- Paginación anterior/siguiente
- Badges de estado con los colores del sistema CLM
- DropdownMenu de acciones por fila (Copiar ID, Ver contrato, Ver historial, Cancelar)

**Landing page (`src/app/page.tsx`):**

Landing de demostración que muestra el sistema de diseño:
1. **Navbar** — sticky, logo + ALETHEIA + links + botón login
2. **Hero** — `h-[calc(100vh-64px)]`, logo integrado, título proporcional, tarjeta mock de contrato
3. **Strip** — banda negra con features técnicas
4. **Características** — 3 cards (Solicitudes, Flujo Legal, Firmas)
5. **Sistema de Diseño** — showcase de todos los componentes: botones, estados, badges, inputs, métricas, data table
6. **5 Roles** — cards con privilegios por rol
7. **CTA** — fondo negro con patrón diagonal
8. **Footer**

**Para levantar el frontend:**
```bash
cd clm-system/apps/frontend/web-shell
npm run dev   # puerto 4000
# http://localhost:4000
```

> **Nota:** El frontend se instaló con `npm` (no pnpm) por limitaciones de red al momento de la sesión. Los paquetes del backend aún no están instalados — hacerlo cuando la conexión lo permita con `pnpm install` desde la raíz.

---

### 4. `packages/shared-schemas/`

Paquete ligero con los tipos TypeScript compartidos entre frontend y backend:
- `Role`, `ContractStatus`, `ProviderType`, `Privilege` (catálogo completo de 19 privilegios)
- `AuthResponse`, `ApiResponse<T>`

---

## Decisiones técnicas tomadas hoy

| Decisión | Motivo |
|---|---|
| **Biome en lugar de ESLint + Prettier** | Un solo binario, más rápido, sin conflictos de configuración |
| **Tailwind v4 CSS-first** | Sin `tailwind.config.ts`; la fuente de verdad es `globals.css` con `@theme inline` |
| **Neobrutalism sobre shadcn estándar** | Estética diferenciada para el proyecto; paleta blanco/negro/#15A8B5 coherente con el logo |
| **Barlow Condensed para headings** | Condensed por diseño (no "squished"), impactante a grandes tamaños, neobrutalist |
| **IBM Plex Mono para cuerpo** | Refuerza la estética de "documento/contrato" del CLM |
| **`@tanstack/react-table`** | Tabla con sorting/filtering/paginación sin dependencias de diseño — se estiliza con los propios componentes neobrutalism |
| **Frontend instalado con npm** | La red bloqueaba descargas grandes de @nestjs/* vía pnpm; el frontend se aisló para poder avanzar |

---

## Archivos creados o modificados hoy

### Monorepo raíz
- `clm-system/package.json`
- `clm-system/pnpm-workspace.yaml`
- `clm-system/turbo.json`
- `clm-system/tsconfig.base.json`
- `clm-system/biome.json`
- `clm-system/commitlint.config.cjs`
- `clm-system/.gitignore`, `.editorconfig`, `.nvmrc`, `.npmrc`
- `clm-system/.husky/pre-commit`, `commit-msg`
- `clm-system/infra/docker/compose/docker-compose.dev.yml`

### Backend
- `apps/backend/package.json`, `tsconfig.json`, `nest-cli.json`, `.env.example`
- `apps/backend/prisma/schema.prisma`
- `apps/backend/src/main.ts`, `app.module.ts`
- `apps/backend/src/prisma/prisma.service.ts`, `prisma.module.ts`
- `apps/backend/src/common/filters/http-exception.filter.ts`
- `apps/backend/src/common/interceptors/transform.interceptor.ts`
- `apps/backend/src/auth/` — módulo completo (8 archivos)
- `apps/backend/src/{users,contracts,documents,workflow,signatures,notifications,reports,catalogs}/` — módulos stub

### Frontend
- `apps/frontend/web-shell/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- `apps/frontend/web-shell/components.json`
- `apps/frontend/web-shell/public/logo.png`
- `apps/frontend/web-shell/src/app/globals.css`
- `apps/frontend/web-shell/src/app/layout.tsx`
- `apps/frontend/web-shell/src/app/page.tsx`
- `apps/frontend/web-shell/src/lib/utils.ts`
- `apps/frontend/web-shell/src/components/ui/button.tsx`
- `apps/frontend/web-shell/src/components/ui/card.tsx`
- `apps/frontend/web-shell/src/components/ui/badge.tsx`
- `apps/frontend/web-shell/src/components/ui/input.tsx`
- `apps/frontend/web-shell/src/components/ui/table.tsx`
- `apps/frontend/web-shell/src/components/ui/checkbox.tsx`
- `apps/frontend/web-shell/src/components/ui/dropdown-menu.tsx`
- `apps/frontend/web-shell/src/components/data-table.tsx`

### Shared
- `packages/shared-schemas/package.json`, `tsconfig.json`, `src/index.ts`

---

## Puntos importantes para retomar

- **El backend no tiene dependencias instaladas** — al retomar, ejecutar `pnpm install` desde `clm-system/` cuando la red lo permita (los paquetes @nestjs/* son pesados).
- **El frontend sí está funcional** — levanta con `npm run dev` desde `apps/frontend/web-shell/` en el puerto 4000.
- **Sprint 2 comienza el 26 de mayo** — la prioridad es el flujo principal: Solicitudes → revisión del Abogado. Arrancar por el módulo `contracts` del backend y el microfrontend `solicitudes-mf`.
- **La biblioteca de componentes UI está definida** — Neobrutalism + shadcn + Tailwind v4. No cambiar de librería.
- **La fuente de verdad de diseño es `globals.css`** — todos los tokens de color, sombra, radio y tipografía viven ahí en `@theme inline`. Para agregar tokens nuevos, editarlo ahí (no crear `tailwind.config.ts`).
- **Agregar microfrontends** — cuando se cree el primer MF (`solicitudes-mf`), configurar Module Federation en `next.config.ts` del web-shell.
- **La landing page es solo demostración** — `apps/frontend/web-shell/src/app/page.tsx` se reemplazará con el layout real de la aplicación cuando empiece la implementación del Sprint 2.

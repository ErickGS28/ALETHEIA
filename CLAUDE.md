# CLAUDE.md

Guía rápida para trabajar en este repo con asistencia de IA. No es documentación del producto —
para eso, empieza en [`docs/00-overview/vision-general.md`](docs/00-overview/vision-general.md).

## Qué es este proyecto

**ALETHEIA (CLM)** — gestor del ciclo de vida de contratos. Monorepo pnpm + Turborepo: backend
NestJS (API Gateway + 4 microservicios sobre Redis pub/sub) y frontend Next.js (`web-shell` +
7 microfrontends vía Multi-Zones). Ver [`docs/01-architecture/arquitectura-explicada.md`](docs/01-architecture/arquitectura-explicada.md)
para el porqué, y [`docs/01-architecture/implementacion.md`](docs/01-architecture/implementacion.md)
para la referencia técnica exhaustiva.

## Comandos

Todo se ejecuta **desde la raíz del repo** (Husky y Turborepo dependen de estar en la raíz).

```bash
pnpm install        # instala el workspace completo
pnpm setup:env      # genera los .env de los 5 servicios backend desde .env.example
pnpm infra:up       # levanta PostgreSQL + Redis (Docker Compose) — Docker Desktop debe estar abierto
pnpm db:migrate     # migraciones Prisma de los 4 microservicios
pnpm db:seed        # usuarios demo, catálogos, etapas del flujo

pnpm dev:fe         # solo los 8 frontends (host + 7 MFs) — sin Docker
pnpm dev:core       # subset funcional: gateway + auth/contracts/workflow + web-shell + solicitudes-mf + flujo-mf
pnpm dev            # todo el sistema (~15 procesos, pesado en laptop)

pnpm build          # build de todo el monorepo (Turborepo)
pnpm lint           # Biome
pnpm test           # tests de todo el workspace
```

Para una sola app: `pnpm --filter <nombre> dev` (p. ej. `pnpm --filter @aletheia/gateway dev`).

Guía completa con troubleshooting: [`docs/03-runbooks/ejecutar-proyecto.md`](docs/03-runbooks/ejecutar-proyecto.md).

## Gotchas conocidos

- **Windows + Turborepo:** nunca uses `--filter='*-mf'` — cmd.exe pasa las comillas simples
  literales y turbo solo levanta `web-shell`. Usa `dev:fe`/`dev:core` (ya listan cada filtro
  explícito) en vez de armar el comando a mano.
- **`scripts/dev-staged.mjs`** (arranque escalonado, pensado para no saturar RAM en Windows) no
  compila `@aletheia/backend-commons` antes de arrancar los servicios backend — a diferencia de
  `pnpm dev`/`turbo dev`, que sí resuelve esa dependencia solo. Si lo usas, compílalo antes:
  `pnpm --filter @aletheia/backend-commons build`.
- **El gateway corre en el puerto 3001, no 3000** (a propósito, para no chocar con Grafana).
- **`clm-system/`** es el monolito anterior a la reestructura de microservicios/microfrontends
  (30 de julio de 2026). Ya no es el código activo — el sistema real vive en `apps/`. Sigue en el
  repo temporalmente (se elimina en un commit aparte, para poder volver a una versión estable si
  hace falta); no lo trates como parte del sistema en ejecución ni edites ahí.
- **`.worktrees/`** puede contener ramas de feature aisladas en progreso (git worktrees reales,
  no confundir con copias sueltas). Antes de tocar o eliminar algo ahí, confirma con el usuario —
  puede ser trabajo sin terminar de una sesión anterior.

## Convenciones

- **Commits:** Conventional Commits, validados por commitlint + Husky —
  `<tipo>(<scope>): <descripción corta>` (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`,
  `style`).
- **Ramas:** `main` (estable) ← `dev` (integración) ← `feature/*` / `fix/*` / `docs/*`. Todo cambio
  a `dev` pasa por Pull Request.
- **Formato:** Biome (`pnpm lint`), hook de pre-commit vía Husky.
- **Documentación de sesiones de desarrollo:** cada sesión de trabajo relevante se registra en
  `changelog(historial)/YYYY-MM-DD-tema.md` (bitácora interna, en español, no es la documentación
  de producto). Antes de empezar una tarea grande, revisa el changelog más reciente para tener
  contexto de en qué quedó el trabajo anterior.

## Mapa rápido de documentación

| Necesito... | Está en... |
|---|---|
| Entender el proyecto de punta a punta | `docs/00-overview/vision-general.md` |
| Entender roles y privilegios | `docs/04-product/roles.md` |
| Entender el flujo de estados del contrato | `docs/04-product/flujo-y-estados.md` |
| Entender la arquitectura y sus trade-offs | `docs/01-architecture/arquitectura-explicada.md` |
| Referencia técnica exhaustiva (endpoints, schemas, patrones) | `docs/01-architecture/implementacion.md` |
| Decisiones de arquitectura formales | `docs/01-architecture/decisions/` |
| Qué está realmente implementado vs. pendiente | `docs/04-product/roles-y-cobertura.md` |
| Probar el flujo completo con cuentas demo | `docs/04-product/manual-roles-y-flujo-qa.md` (también en `/manual` con el sistema corriendo) |
| Contexto de sesiones de desarrollo anteriores | `changelog(historial)/` |

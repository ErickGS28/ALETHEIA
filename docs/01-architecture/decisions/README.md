# ADRs — Architecture Decision Records

Registro de decisiones de arquitectura de ALETHEIA (CLM). Cada ADR documenta una decisión,
su contexto y sus consecuencias. Estos archivos son el desglose individual de los ADRs
resumidos en [`../implementacion.md`](../implementacion.md) §18; la fuente base es la spec
[`2026-06-01-arquitectura-microservicios-microfrontends-design.md`](../../superpowers/specs/2026-06-01-arquitectura-microservicios-microfrontends-design.md).

| ADR | Título | Estado |
|---|---|---|
| [ADR-0001](./ADR-0001-monorepo-turborepo-pnpm.md) | Monorepo con Turborepo + pnpm | Aceptado |
| [ADR-0002](./ADR-0002-microservicios-nestjs-api-gateway.md) | Microservicios NestJS + API Gateway | Aceptado |
| [ADR-0003](./ADR-0003-jwt-privilegios-en-payload.md) | JWT con privilegios en payload | Aceptado |
| [ADR-0004](./ADR-0004-state-machine-etapas-en-bd.md) | State Machine con etapas en BD | Aceptado |
| [ADR-0005](./ADR-0005-prisma-orm.md) | Prisma ORM | Aceptado |
| [ADR-0006](./ADR-0006-microfrontends-nextjs-multi-zones.md) | Microfrontends con Next.js Multi-Zones | Aceptado |
| [ADR-0007](./ADR-0007-transporte-redis-pubsub.md) | Transporte Redis pub/sub entre gateway y servicios | Aceptado |
| [ADR-0008](./ADR-0008-schema-per-service.md) | Schema-per-service en un solo PostgreSQL | Aceptado |

> Histórico: el ADR-0002 reemplaza la decisión previa de "Monolito Modular NestJS" y el
> ADR-0006 reemplaza la de "Module Federation para Microfrontends" (ver §18 de implementacion.md).

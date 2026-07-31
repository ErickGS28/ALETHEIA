# ADR-0005 — Prisma ORM

**Estado:** Aceptado

## Contexto

Se necesita acceso a datos type-safe y migraciones versionadas sobre PostgreSQL, en un esquema
de microservicios donde cada servicio es dueño de su porción del modelo.

## Decisión

Usar **Prisma** como ORM. Cada microservicio tiene su propio `schema.prisma`, que es la fuente
de verdad de su porción del modelo de datos, con el preview feature `multiSchema` activado para
soportar schema-per-service (ver [ADR-0008](./ADR-0008-schema-per-service.md)).

## Consecuencias

- Type-safety auto-generada en el cliente Prisma de cada servicio.
- Migraciones explícitas y versionadas por servicio.
- Agregar columnas obliga a regenerar el cliente Prisma del servicio afectado.

# ADR-0008 — Schema-per-service en un solo PostgreSQL

**Estado:** Aceptado

## Contexto

En microservicios, cada servicio debería ser dueño de sus datos. Una base de datos por servicio
(DB-per-service) es overkill operacional para el alcance del curso, pero un schema único acopla
todos los servicios.

## Decisión

Usar **un solo contenedor PostgreSQL** (`clm_dev`) con **un schema por servicio**:
`auth`, `contracts`, `workflow`, `documents`. Cada microservicio tiene su propio `schema.prisma`
con `previewFeatures = ["multiSchema"]` y `schemas = ["<su-schema>"]`, y conecta con
`DATABASE_URL ...?schema=<su-schema>`.

Las referencias entre dominios (p.ej. `Contract.createdBy` → `userId` del schema `auth`,
`Document.contractId` → `Contract`) se guardan como **`String`, sin FK cross-schema**. La
existencia se valida en el servicio dueño. Dentro de un mismo schema sí se usan relaciones Prisma
con integridad referencial.

## Consecuencias

- Aislamiento lógico de datos por servicio (fiel a microservicios) con una sola instancia de
  Postgres.
- No hay integridad referencial entre schemas; se compensa con validación en el servicio dueño.
- Los IDs históricos (userId desactivado) se conservan aunque la entidad cambie de estado.
- Mapeo completo entidad→schema en [`../base-datos.md`](../base-datos.md).

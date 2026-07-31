# ADR-0002 — Microservicios NestJS + API Gateway

**Estado:** Aceptado · **Reemplaza:** la decisión previa "Monolito Modular NestJS".

## Contexto

El doc de referencia del curso exige **microservicios**. El backend previo era un único
proyecto NestJS (monolito modular), que no cumple ese requisito y no permite escalar/desplegar
por dominio.

## Decisión

Estructurar el backend como un **API Gateway** (único punto HTTP REST) + **4 microservicios**
NestJS, más una librería compartida `commons`:

- `gateway`: valida JWT, aplica `PrivilegeGuard`, expone Swagger y enruta a los servicios.
  Sin lógica de negocio ni base de datos.
- `auth-service`: auth, usuarios, roles, privilegios.
- `contracts-service`: contratos + catálogos (areas, societies, apoderados, templates).
- `workflow-service`: state machine + SLA + notifications (Observer).
- `documents-service`: documentos (Factory) + firmas (Strategy).
- `commons`: contracts (DTOs/eventos), observability (logger), security (JWT), utils.

## Consecuencias

- Cada servicio es autónomo, dueño de su schema y desplegable por separado.
- Mayor complejidad operacional (más procesos en dev), mitigada con `pnpm dev:core`.
- La comunicación es REST hacia el gateway y mensajería Redis entre gateway y servicios
  (ver [ADR-0007](./ADR-0007-transporte-redis-pubsub.md)); no hay llamadas directas entre
  servicios.

# Consideraciones Generales

Notas de alcance y mejoras opcionales del proyecto ALETHEIA (CLM).
La arquitectura aprobada está en [`docs/01-architecture/implementacion.md`](../01-architecture/implementacion.md)
y la spec base en [`docs/superpowers/specs/2026-06-01-arquitectura-microservicios-microfrontends-design.md`](../superpowers/specs/2026-06-01-arquitectura-microservicios-microfrontends-design.md).

## Pitch para el final

- Editor interno (WYSIWYG de contratos): da más peso al proyecto.

## Ya forman parte de la arquitectura base (no son "extra")

- **Microservicios** NestJS + API Gateway.
- **Redis**: transporte pub/sub entre gateway y microservicios (`Transport.REDIS`).
  No se usa (todavía) como caché; ese uso queda como mejora opcional.
- **PostgreSQL** con schema-per-service (Prisma `multiSchema`).
- **Microfrontends** Next.js con Multi-Zones.

## Extra (si da tiempo hasta el final)

- Logs estructurados: Winston o Pino.
- Monitoreo: Grafana / Prometheus.
- Caché con Redis (además de su uso como transporte).
- Eventos durables: Kafka + outbox (hoy Redis pub/sub es *fire-and-forget*).
- Resiliencia: Circuit Breaker entre gateway y servicios.
- i18n.

## Riesgo de cumplimiento — UI

El curso pide **MUI**, pero el equipo decidió usar **Neobrutalism/shadcn + Tailwind v4**
(ver Riesgo R1 de la spec). **Confirmar con el profesor** si MUI es estricto; plan B sería
MUI con theme custom.
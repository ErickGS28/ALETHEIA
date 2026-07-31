# ADR-0007 — Transporte Redis pub/sub entre gateway y servicios

**Estado:** Aceptado

## Contexto

Con el backend dividido en microservicios ([ADR-0002](./ADR-0002-microservicios-nestjs-api-gateway.md)),
el gateway necesita un transporte para comunicarse con los servicios. Un broker pesado (Kafka,
RabbitMQ) es overkill para el alcance del curso.

## Decisión

Usar **Redis pub/sub** como transporte vía `@nestjs/microservices` con `Transport.REDIS`:

- **Request-response:** `ClientProxy.send()` desde el gateway hacia el `@MessagePattern` del
  servicio.
- **Eventos:** `emit()` para notificar hechos (p.ej. cambio de estado de un contrato), consumidos
  por el módulo Notifications dentro de `workflow-service` (patrón **Observer**).

## Consecuencias

- Infraestructura simple: el mismo Redis del compose sirve de transporte.
- Caveat: pub/sub es **fire-and-forget**, sin garantía de entrega. Aceptable para el alcance.
- Manejo de fallos: timeouts/caídas de Redis → el gateway responde `503/504` uniforme.
- Mejora futura: **Kafka + outbox** para eventos durables; **Circuit Breaker** para resiliencia.

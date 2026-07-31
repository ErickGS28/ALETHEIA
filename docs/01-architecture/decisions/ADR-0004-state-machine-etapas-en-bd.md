# ADR-0004 — State Machine con etapas en BD

**Estado:** Aceptado

## Contexto

El flujo de revisión de contratos tiene estados y transiciones bien definidos. El Administrador
debe poder configurar las etapas (orden, rol asignado, SLA) sin redeploy.

## Decisión

Modelar el flujo con una **State Machine** en `workflow-service`
(`workflow/state-machine/contract-state-machine.ts`) que valida que cada acción sea válida en el
estado actual. Las **etapas (`WorkflowStage`) viven en BD**, configurables por el Administrador
con el privilegio `WORKFLOW_CONFIG`.

## Consecuencias

- Se eliminan estados inválidos por construcción.
- El motor está cerrado a modificación pero abierto a nuevas configuraciones (principio
  **Open/Closed** de SOLID).
- El cambio de estado emite un evento consumido por Notifications (Observer, ver
  [ADR-0007](./ADR-0007-transporte-redis-pubsub.md)).

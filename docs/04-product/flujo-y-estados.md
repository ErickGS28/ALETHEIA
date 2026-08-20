# Flujo y Estados del Contrato — ALETHEIA (CLM)

> Explica el ciclo de vida de un contrato: los estados, quién dispara cada transición y qué pasa en
> los caminos que no son el camino feliz. Para el detalle de qué hace cada rol, ver
> [`roles.md`](./roles.md). Para los endpoints y el modelo de datos exacto, ver
> [`implementacion.md` §8–9](../01-architecture/implementacion.md).

## La idea: siete estados, cinco relevos

Un contrato nace y muere dentro de una **máquina de estados**: en todo momento tiene exactamente un
estado, y solo puede pasar al siguiente si el rol dueño de esa transición la dispara. No hay forma
de "saltarse" un paso ni de que dos personas lo muevan a la vez de maneras contradictorias — el
estado vive en el backend (`workflow-service`), no es una convención que la gente deba recordar.

```
[DRAFT] ──envía (Solicitante)──▶ [SUBMITTED] ──aprueba (Administrador)──▶ [ADMIN_REVIEW]
                                                        │
                                            aprueba (Abogado)
                                                        ▼
                                              [LAWYER_REVIEW]
                                                        │
                                          aprueba (Aprobador)
                                                        ▼
                                            [APPROVAL_PENDING]
                                              │              │
                                        pasa a firma      rechaza (Aprobador)
                                              ▼              ▼
                                         [SIGNING]      [REJECTED]  ← final
                                              │
                                     firma (Firmante)
                                              ▼
                                         [SIGNED]  ← final

Desde cualquier estado activo:  ──cancela (Solicitante/Administrador)──▶  [CANCELLED]
Desde CANCELLED:                ──recupera (Solicitante/Administrador)──▶ [DRAFT]
```

## Paso a paso

### 1 · `DRAFT` — Borrador

El contrato existe pero solo lo ve el Solicitante que lo creó. Tiene folio automático, datos
generales (sociedad, proveedor, área) y la documentación de soporte requerida según el tipo de
proveedor. Es el único estado en el que el Solicitante puede seguir editando. Cuando está completo,
lo envía a revisión → pasa a `SUBMITTED`.

### 2 · `SUBMITTED` → revisión del Administrador

El Administrador ve el contrato en su cola. Revisa los datos y documentos. Dos caminos:

- **Aprueba** → el contrato avanza a `ADMIN_REVIEW`.
- **Regresa con observaciones** → vuelve a `DRAFT`. El Solicitante ve el motivo, corrige y vuelve a
  enviar. A esto el equipo le llama el **"ping-pong"**: evita que un contrato mal armado avance más
  allá de donde alguien pueda detectarlo a tiempo.

### 3 · `ADMIN_REVIEW` → revisión legal del Abogado

Aquí ocurre el paso más importante del flujo: el Abogado no solo revisa, **conecta una plantilla
con este contrato específico**, redactando el documento formal que todos los roles siguientes van a
ver y firmar. El sistema no deja aprobar sin ese documento — es una regla de negocio explícita, no
solo una convención de proceso.

- **Aprueba** (con documento ya elaborado) → avanza a `LAWYER_REVIEW`.
- **Devuelve con observaciones** → vuelve a `DRAFT`.

### 4 · `LAWYER_REVIEW` → aprobación de negocio

El Aprobador recibe el contrato con el documento formal ya listo. Puede abrir una vista previa
antes de decidir. Dos caminos, pero ya no simétricos:

- **Aprueba** → pasa a `APPROVAL_PENDING`, habilitando la firma.
- **Rechaza** → pasa directo a `REJECTED`, estado **final**. A diferencia de las devoluciones de
  Administrador y Abogado, esto no es una vuelta a `DRAFT` para corregir: es el cierre del proceso.
  Es la puerta que, si se cierra, no se vuelve a abrir.

### 5 · `APPROVAL_PENDING` → listo para firmar

El contrato ya tiene todas las aprobaciones. La transición a `SIGNING` habilita al Firmante a
actuar sobre él.

### 6 · `SIGNING` → captura de firma

El Firmante ve el contrato en su bandeja, abre la vista previa del documento formal (mismo
componente que usó el Aprobador para revisar) y dibuja la firma en un lienzo digital, opcionalmente
en representación de un apoderado registrado.

### 7 · `SIGNED` — estado final

El contrato queda firmado y cerrado. Es, junto con `REJECTED` y `CANCELLED`, uno de los tres estados
de los que ya no sale.

## Caminos que no son el camino feliz

| Camino | Quién lo dispara | Qué pasa |
|---|---|---|
| **Devolución** | Administrador o Abogado, durante su revisión | El contrato vuelve a `DRAFT` con un comentario obligatorio. El Solicitante corrige y reenvía. Puede pasar más de una vez. |
| **Rechazo** | Aprobador, en `LAWYER_REVIEW` | El contrato pasa a `REJECTED` — final, sin vuelta atrás. El motivo queda en la bitácora. |
| **Cancelación** | Solicitante (su propio contrato) o Administrador, desde cualquier estado activo | El contrato pasa a `CANCELLED` con motivo obligatorio. No es un rechazo: es que el proceso ya no tiene sentido continuarlo (p. ej. el proveedor se retiró). |
| **Recuperación** | Solicitante o Administrador, desde `CANCELLED` | El contrato vuelve a `DRAFT`, conservando todo su historial, y puede reiniciar el proceso desde cero. |

## El semáforo de SLA

Cada etapa del flujo tiene un tiempo máximo configurado (`slaHours`) — cuánto debería tardar, como
máximo, en que su responsable la atienda. El sistema calcula cuánto tiempo lleva el contrato en su
etapa actual y lo traduce en un color, para que Administrador y Abogado detecten de un vistazo qué
contratos necesitan atención urgente sin tener que revisar fecha por fecha:

| Color | Condición | Significado |
|---|---|---|
| 🟢 Verde | Menos del 60% del SLA consumido | Dentro de tiempo, sin urgencia |
| 🟡 Amarillo | Entre 60% y 100% del SLA | Por vencer, requiere atención |
| 🔴 Rojo | SLA superado | Vencido — el contrato está en mora |

Las etapas y su SLA no están fijas en el código: el Administrador las configura desde
**Administración → Etapas del flujo**, incluyendo el rol responsable de cada una y las horas
permitidas. El proceso puede ajustarse sin que nadie toque una línea de código.

## Notificaciones

Cada transición de estado dispara una notificación automática hacia quien sigue en la cadena — el
Solicitante no tiene que estar preguntando "¿ya lo revisaron?": el sistema le avisa cuando le toca
actuar, o cuando algo se le devolvió con observaciones.

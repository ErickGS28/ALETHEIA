# ALETHEIA CLM — Análisis de Intents para la Alexa Skill

Este documento confirma la lectura de `ALETHEIA-CLM-Skill.pdf` y `Copia de Actividad1Integradora (1).pdf`, y deja explícitas las decisiones de diseño tomadas para poder implementar la skill contra el backend **real** (que ya diverge en varios puntos de `DocumentacionParaElEquipo/PropuestaBD.md`). Revisar antes de que se generen `.js`/`.json` y los cambios de backend.

---

## 1. Intents capturados

### 1.1 `LaunchRequest` — apertura de sesión

| | |
|---|---|
| Utterance | "Alexa, abre CLM" |
| Slots | Ninguno |
| Respuesta | "Bienvenido al resumen ejecutivo de ALETHEIA. Puedo darte el reporte de contratos firmados, alertarte sobre cuellos de botella o listar contratos por expirar. ¿Qué métrica deseas consultar hoy?" |
| Endpoint | Ninguno (respuesta estática) |
| Sesión | Queda abierta (`shouldEndSession: false`) |

### 1.2 `ResumenEjecutivoIntent` — panorama del día

| | |
|---|---|
| Utterances | "Dame mi resumen del día.", "Reporte ejecutivo de contratos.", "¿Cómo vamos con los contratos?" |
| Slots | Ninguno |
| Respuesta | "Hoy tienes {cantidadPendientes} contratos por revisar, se han firmado {cantidadFirmados} y {cantidadRechazados} fueron rechazados." |
| Endpoint | `GET /reports/daily-summary` |

### 1.3 `ConsultarMetricasPorFechaIntent` — cantidad por estado y rango de fecha

| | |
|---|---|
| Utterances | "¿Cuántos contratos fueron rechazados el mes pasado?", "Dime los contratos firmados esta semana.", "Resumen de contratos aprobados hoy." |
| Slots | `rangoFecha` (`AMAZON.DATE`, obligatorio), `estadoContrato` (`EstadoContratoType` custom, obligatorio) |
| Respuesta | "En {rangoFecha}, se registraron {cantidad} contratos en estado {estadoContrato}." |
| Endpoint | `GET /contracts/metrics?status={estadoContrato}&startDate={isoStart}&endDate={isoEnd}` |

### 1.4 `ConsultarContratosPorExpirarIntent` — contratos por vencer

| | |
|---|---|
| Utterances | "¿Qué contratos vencen este mes?", "Dime qué acuerdos expiran en los próximos 30 días.", "Contratos a punto de caducar." |
| Slots | `rangoFecha` (`AMAZON.DATE`, obligatorio) |
| Respuesta | "Tienes {cantidad} contratos que expiran en {rangoFecha}. El más urgente es con el cliente {nombreCliente}." |
| Endpoint | `GET /contracts/expiring?startDate={isoStart}&endDate={isoEnd}` |

### 1.5 `AlertaCuelloDeBotellaIntent` — etapa con más contratos estancados

| | |
|---|---|
| Utterances | "¿Dónde están atorados los contratos?", "¿Qué etapa tiene más contratos pendientes?", "Reporte de cuellos de botella." |
| Slots | Ninguno |
| Respuesta | "Actualmente, la etapa de {etapaFlujo} concentra {cantidad} contratos que han superado su tiempo límite de revisión." |
| Endpoint | `GET /reports/bottlenecks` |

### 1.6 `HelpIntent` — ayuda

| | |
|---|---|
| Utterances | "Ayuda", "¿Qué puedo decir?", "Opciones" |
| Slots | Ninguno |
| Respuesta | "Puedes pedirme un resumen ejecutivo del día, preguntar por contratos rechazados este mes, o consultar qué contratos vencen pronto." |
| Endpoint | Ninguno |

### 1.7 Intents de sistema (no vienen en el PDF pero son obligatorios para certificación Alexa)

`AMAZON.CancelIntent`, `AMAZON.StopIntent`, `AMAZON.FallbackIntent` — cierran o recuperan la sesión sin llamar al backend, según el punto 4 del flujo de conversación ("Cierre de Sesión: CancelIntent, StopIntent o timeout").

---

## 2. Slots

| Slot | Tipo | Intents | Obligatorio | Prompt de elicitación |
|---|---|---|---|---|
| `rangoFecha` | `AMAZON.DATE` | `ConsultarMetricasPorFechaIntent`, `ConsultarContratosPorExpirarIntent` | Sí | "¿Para qué periodo deseas consultar esta información?" |
| `estadoContrato` | `EstadoContratoType` (custom) | `ConsultarMetricasPorFechaIntent` | Sí | "¿Qué estado deseas consultar? Por ejemplo: firmados, rechazados o en revisión." |

**Elicitación:** ambos intents usan `dialog delegate` — si el usuario no da el slot en el utterance inicial, Alexa lo pide automáticamente con el prompt de arriba, sin lógica manual en el handler.

---

## 3. Mapeo de `EstadoContratoType` → `ContractStatus` (backend real)

El `ContractStatus` real (`schema.prisma`) es: `DRAFT, SUBMITTED, ADMIN_REVIEW, LAWYER_REVIEW, APPROVAL_PENDING, SIGNING, SIGNED, REJECTED, CANCELLED` — **no existe un estado `APPROVED` separado** (a diferencia de `PropuestaBD.md`, que quedó desactualizado). Según `HistoriasDeUsuarioCopy.md` HU-14, al aprobar formalmente el contrato pasa directo a `SIGNING`.

| Valor hablado (id del slot) | `ContractStatus` |
|---|---|
| "borrador" / "borradores" | `DRAFT` |
| "enviado" / "enviados" / "enviada" | `SUBMITTED` |
| "en revisión del administrador" / "revisión administrativa" | `ADMIN_REVIEW` |
| "en revisión del abogado" / "revisión legal" | `LAWYER_REVIEW` |
| "pendiente de aprobación" / "por aprobar" | `APPROVAL_PENDING` |
| **"aprobado" / "aprobados"** | **`SIGNING`** ⚠️ decisión — ver nota |
| "en firma" / "por firmar" | `SIGNING` |
| "firmado" / "firmados" / "firmada" | `SIGNED` |
| "rechazado" / "rechazados" / "rechazada" | `REJECTED` |
| "cancelado" / "cancelados" / "cancelada" | `CANCELLED` |

> ⚠️ **Nota confirmada con el usuario:** el PDF usa "contratos aprobados" en un ejemplo de utterance, pero el schema real no tiene un estado `APPROVED` distinguible de `SIGNING`. Se mapea "aprobado(s)" al id `SIGNING`, ya que es el estado inmediato tras la aprobación formal (HU-14). Si se prefiere que "aprobados" apunte a `APPROVAL_PENDING` en su lugar, es un cambio de una línea en el interaction model.

---

## 4. Endpoints — contrato de datos

Todos requieren `Authorization: Bearer <accessToken>` + privilegio `REPORTS_VIEW` (ya existe y está asignado a Administrador/Abogado/Aprobador). Las respuestas van envueltas por el `TransformInterceptor` existente: `{ data, statusCode, message }` — abajo se describe solo `data`.

### `GET /reports/daily-summary`
```json
{ "pendientes": 12, "firmados": 3, "rechazados": 1, "fecha": "2026-07-14" }
```
- `pendientes`: contratos con `status` fuera de `SIGNED`, `REJECTED`, `CANCELLED` (carga de trabajo activa actual).
- `firmados` / `rechazados`: contratos cuyo `status` actual es `SIGNED`/`REJECTED` **y** `updatedAt` cae en el día de hoy.

> ⚠️ **Supuesto:** el schema real no tiene una tabla de historial de transiciones (`WorkflowTransition` no existe en el código, solo en el doc viejo). Se usa `Contract.updatedAt` como proxy de "cuándo cambió de estado", ya que cualquier mutación (incluida una transición) actualiza ese campo automáticamente (`@updatedAt`).

### `GET /contracts/metrics?status={estadoContrato}&startDate={isoStart}&endDate={isoEnd}`
```json
{ "status": "REJECTED", "startDate": "2026-06-01", "endDate": "2026-06-30", "count": 4 }
```
- Cuenta contratos con `status = {status}` y `updatedAt` dentro del rango (mismo supuesto que arriba).

### `GET /contracts/expiring?startDate={isoStart}&endDate={isoEnd}`
```json
{
  "count": 3,
  "contratos": [
    { "id": 12, "title": "Renovación licencias", "vendorName": "Acme S.A.", "status": "SIGNED", "expiresAt": "2026-07-20" }
  ],
  "masUrgente": { "id": 12, "title": "Renovación licencias", "vendorName": "Acme S.A.", "expiresAt": "2026-07-20" }
}
```
- Requiere el nuevo campo `Contract.expiresAt` (ver sección 5). `masUrgente` = el contrato con `expiresAt` más próximo dentro del rango; `nombreCliente` en la respuesta hablada = `vendorName`.

### `GET /reports/bottlenecks`
```json
{
  "etapas": [
    { "stageId": 2, "stageName": "Revisión Legal", "cantidadVencidos": 5 },
    { "stageId": 1, "stageName": "Revisión Administrativa", "cantidadVencidos": 2 }
  ],
  "peor": { "stageName": "Revisión Legal", "cantidadVencidos": 5 }
}
```
- Por cada `ContractWorkflow`, vencido si `(ahora - enteredAt) >= stage.slaHours` horas. Se agrupa por `stageId` y se ordena descendente; `peor` es el primero (o `null` si no hay ninguno vencido).

---

## 5. Cambio de schema necesario

`Contract` no tiene fecha de vencimiento propia — solo `Document.expiresAt` (vigencia de documento, otro concepto de negocio). Se agrega:

```prisma
model Contract {
  // ...campos existentes...
  expiresAt DateTime?
}
```

Migración nueva (`pnpm db:migrate` en `apps/backend`), campo opcional para no romper contratos existentes sin fecha de término definida.

---

## 6. Autenticación de la Skill contra el backend

No hay account linking. La Lambda usa una **cuenta de sistema** (usuario `ADMINISTRADOR` sembrado en `prisma/seed.ts`) cuyas credenciales viven como variables de entorno del Lambda (`CLM_SYSTEM_EMAIL`, `CLM_SYSTEM_PASSWORD`). En frío o cuando el token cacheado expira, la Lambda hace `POST /auth/login`; si el `accessToken` expira a mitad de ejecuciones sucesivas, intenta `POST /auth/refresh` antes de volver a loguearse. El token se cachea en memoria del proceso Lambda (persiste entre invocaciones "warm").

---

## 7. Fuera de alcance (explícito)

- No se toca el `WorkflowModule`, `ContractsModule` de escritura (crear/editar/enviar contratos), ni ningún otro endpoint fuera de los 4 listados.
- No hay account linking / OAuth por usuario — es una única cuenta de sistema.
- El seed de demo es para poder mostrar la skill funcionando, no reemplaza el seed real de roles/permisos que se necesitará cuando se construyan los módulos completos.

---

**Decisiones ya confirmadas por el equipo:** el mapeo "aprobados → SIGNING" (sección 3) y el uso de `updatedAt` como proxy de fecha de cambio de estado (sección 4) son las únicas interpretaciones no explícitas en los PDFs originales, y quedaron aprobadas junto con el resto del diseño. Todo lo demás de este documento es transcripción directa de `ALETHEIA-CLM-Skill.pdf` / `Copia de Actividad1Integradora (1).pdf`.

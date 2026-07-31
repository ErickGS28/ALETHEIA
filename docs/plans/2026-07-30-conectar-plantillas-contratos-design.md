# Diseño: conectar plantillas con el flujo de revisión

## Contexto

QA-testeando el rol Abogado se detectó que "Plantillas" es una feature aislada: el
Abogado puede elaborar el documento formal de un contrato a partir de una plantilla
(`/contratos/elaborar`), pero ese contenido nunca llega a nadie más. La card de
revisión (`ReviewContractCard`, en Flujo de trabajo) solo muestra metadatos escalares
del contrato (folio, proveedor, monto, etc.) en todas las etapas — Aprobador aprueba
"a ciegas" y Firmante firma sin haber visto el documento.

Además, hoy cualquiera con `CONTRACT_EDIT` (incluido Solicitante) puede entrar a
"Elaborar documento" y guardarlo, sin restricción de etapa.

## Decisión de producto (confirmada con el usuario)

Se mantiene el diseño ya intencionado en el código y en el manual QA: el **Abogado**
redacta el documento formal a partir de una plantilla durante su propia etapa de
revisión (`LAWYER_REVIEW`) — no el Solicitante al crear la solicitud. El objetivo de
este trabajo es exclusivamente **conectar** esa redacción con lo que ven los roles
posteriores, no rediseñar quién la origina.

## Alcance

1. Solo el Abogado puede elaborar/guardar el documento, y solo mientras el contrato
   está en `LAWYER_REVIEW`.
2. El Abogado no puede aprobar (pasar a `APPROVAL_PENDING`) sin haber guardado un
   documento — bloqueado en el backend, no solo advertido en la UI.
3. Aprobador (cola `LAWYER_REVIEW`) y Firmante ven el documento elaborado — Aprobador
   integrado en su card de revisión, Firmante antes de firmar.

### Fuera de alcance
- No se enlaza `Contract.templateId` en BD ni se migra el storage del documento
  (hoy un JSON plano en disco vía `FileStorageService`, ya atado al contrato por
  convención de nombre `contract-document-{id}.json`) a un modelo persistente.
- Administrador (etapa `SUBMITTED`) sigue sin ver el documento — en su etapa el
  documento legítimamente no existe todavía.

## Diseño técnico

### Backend (gateway)

**`ContractsController` (`apps/backend/gateway/src/contracts/contracts.controller.ts`)**
- `PUT :id/document`: hoy solo exige el privilegio `CONTRACT_EDIT` (por eso entra
  Solicitante). Cambia a validar dentro del handler: `user.roles.includes('ABOGADO')`
  y que el contrato esté en `LAWYER_REVIEW` (una llamada a `WORKFLOW_PATTERNS.GET`
  antes de guardar). Si no se cumple, 403/400 con mensaje explícito.
- `GET :id/document`: se relaja — deja de exigir `CONTRACT_EDIT` (que solo tienen
  Solicitante/Abogado/Administrador-con-todos-los-privilegios) y pasa a permitir
  lectura a cualquiera que pueda ver el contrato, ya que Aprobador y Firmante
  también necesitan leerlo y no tienen `CONTRACT_EDIT`.

**`WorkflowController` (`apps/backend/gateway/src/workflow/workflow.controller.ts`)**
- `approve()`: antes de reenviar la transición a `workflow-service`, si el estado
  actual del contrato es `LAWYER_REVIEW`, consulta
  `FileStorageService.readText(contractDocumentKey(contractId))`. Si no existe,
  responde 400 sin llegar a `workflow-service` (mensaje: "Elabora el documento
  formal antes de aprobar").
- Requiere agregar `FileStorageService` como provider de `WorkflowModule` (ya está
  en `ContractsModule`, mismo patrón, sin efectos secundarios).
- La regla vive en el gateway y no en `contract-state-machine.ts` porque el storage
  del documento ya vive en el gateway — evita inventar una llamada RPC nueva entre
  microservicios solo para esta validación.

### Frontend

**`ContractEditorView`** (`contratos-mf/src/features/contract-editor/components/ContractEditorView.tsx`)
- Gate de acceso: de `can('TEMPLATES_MANAGE') || can('CONTRACT_EDIT')` a
  `role === 'ABOGADO'` (usa `useRole()`, que expone el rol activo exacto).
- El selector de contratos (`useListContractsQuery`) filtra a solo los contratos en
  `LAWYER_REVIEW` — hoy lista todos sin importar el estado.

**`ReviewContractCard`** (`flujo-mf/src/features/review-panel/components/ReviewContractCard.tsx`)
- Agrega un fetch de `GET /contracts/:id/document`. Si existe, se muestra con
  `DocumentPreview` (componente ya existente en `frontend-commons`, recibe
  `{body, header, footer, pageSetup}`) dentro de la misma card — no en pantalla
  aparte.

**Firmas** (`firmas-mf/src/features/signature-detail/components/SignatureDetailView.tsx`
y/o `signature-canvas/components/SignatureCanvasView.tsx`)
- Mismo patrón: fetch del documento + `DocumentPreview` antes del lienzo de firma.

## Testing
- Backend: casos de `PUT :id/document` (Abogado+LAWYER_REVIEW → 200; otro rol → 403;
  Abogado en otra etapa → 400) y de `approve()` sobre `LAWYER_REVIEW` (sin documento
  → 400; con documento → transición normal).
- Frontend: gate de acceso de `ContractEditorView` por rol; filtro del selector de
  contratos; render condicional de `DocumentPreview` en `ReviewContractCard` y en
  firmas cuando el documento existe/no existe.

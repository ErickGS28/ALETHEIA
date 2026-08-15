# Tres correcciones: estado no se actualiza + vista previa en modal — Diseño

Fecha: 2026-08-08 · Estado: **diseño aprobado**, pendiente de plan de implementación.

## 1. Contexto y motivación

Sesión de QA en vivo con el stack ya levantado (`pnpm dev:staged`). Se reportaron 3 problemas:

1. **Estado no se actualiza automáticamente** tras Aprobar/Devolver/Rechazar (flujo-mf) o
   Enviar a revisión (solicitudes-mf) — el botón sigue mostrando la acción/estado anterior
   hasta que el usuario refresca a mano.
2. **`/contratos/elaborar` confuso**: la sección "Documento del contrato" ya trae los botones
   "Guardar" y "Ver documento"; al dar clic en "Ver documento" la vista previa aparece **debajo**
   de la sección "Diseño de página" sin ningún scroll o aviso — parece que no pasó nada.
3. **Vista previa embebida y fea en la card del Aprobador** (`flujo-mf`, panel de revisión): el
   documento del contrato se muestra siempre expandido dentro de la card, en un recuadro con
   scroll fijo — poco intuitivo comparado con un botón explícito.

## 2. Causa raíz del problema 1 (investigación, no diagnóstico a ciegas)

`workflow-service` es la fuente autoritativa del estado (`ContractWorkflow.status`), pero
`GET /contracts` (lo que alimenta las listas/colas del frontend) lo sirve **`contracts-service`**,
que mantiene su **propia copia** de `Contract.status`. Esa copia se actualiza vía un job de BullMQ
(`workflow.service.ts:132` `enqueueStatusMirror` → cola `CONTRACTS_INBOUND` →
`status-mirror.processor.ts` en `contracts-service`), **asíncrono respecto a la respuesta HTTP**
que ya recibió el frontend.

RTK Query invalida (`invalidatesTags`) y vuelve a pedir `GET /contracts` **inmediatamente**
después de que la mutación (`approve`/`reject`/`return`/`submit`) responde — antes de que el job
asíncrono necesariamente haya terminado. Confirmado en vivo contra el stack real: en condiciones
normales el espejo tarda ~30-40ms, pero esa ventana se agranda bajo la carga que ya tiene esta
máquina (RAM al límite, 40+ procesos node) — coincide con el "a veces" reportado. Una vez que
React Query cachea esa lectura perdida, no reintenta solo: se queda así hasta un refetch manual.

**Dato clave para el fix**: la respuesta de la propia mutación (`approve`/`reject`/`return`/
`submit`) YA trae el estado nuevo correcto — es la respuesta síncrona de `workflow-service`
(`{ contractId, status, stageId, stageName, enteredAt }`), disponible antes de que el espejo
asíncrono termine. No hace falta esperar ni reintentar: se puede usar ese valor de inmediato.

## 3. Objetivos

- **Fix 1**: eliminar la carrera visible parcheando el caché de RTK Query con el estado que ya
  trae la respuesta de la mutación (`onQueryStarted` + `updateQueryData`), en vez de depender
  solo de la invalidación de tags + refetch de red.
- **Fix 2**: mover la vista previa de `/contratos/elaborar` a un `Modal` (ya existe en
  `@aletheia/frontend-commons`), eliminando el problema de posición/scroll.
- **Fix 3**: reemplazar la vista previa siempre-expandida en la card del Aprobador por un botón
  "Ver contrato" que abre el mismo `Modal`, y hacer perezosa la carga del documento (solo al
  abrir el modal, no para las 10 cards de la cola a la vez).

## 4. No-objetivos (YAGNI)

- **No se toca el backend** ni la arquitectura de colas (`CONTRACTS_INBOUND`,
  `enqueueStatusMirror`). El parche de caché en frontend resuelve la experiencia visible; la
  inconsistencia de datos entre servicios por esos ~30-40ms sigue existiendo para otros
  consumidores de `GET /contracts` (reportes, etc.), pero eso queda fuera de alcance — confirmado
  con el usuario como aceptable por ahora.
- No se corrige la imprecisión de tipos ya existente (`submitContract` declarado como
  `b.mutation<BackendContract, number>` cuando en runtime responde el shape de
  `workflow-service`) más allá de lo estrictamente necesario para escribir el fix con seguridad
  de tipos — se documenta inline, no se persigue como refactor aparte.
- No se crean componentes nuevos de modal — se reutiliza `Modal` y `DocumentPreview`, ya
  existentes y usados en otras partes del código (`ReviewActionModal.tsx`, etc.).
- No se cambia el contenido/comportamiento de "Guardar documento" en `/contratos/elaborar` — solo
  se mueve la vista previa a un modal, sin alterar cuándo se dispara (sigue mostrando el
  contenido actual del editor, guardado o no).

## 5. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Fix 1 — mecanismo | `onQueryStarted` + `dispatch(api.util.updateQueryData(...))` sobre las queries de lista/detalle afectadas, usando el `status` que ya trae la respuesta de la mutación |
| Fix 1 — alcance | `flujo-mf/src/features/_shared/flujo-api.ts` (`approveWorkflow`, `rejectWorkflow`, `returnWorkflow`) y `solicitudes-mf/src/features/_shared/api/contracts-api.ts` (`submitContract`) |
| Fix 1 — si falla el patch | El `catch` del `onQueryStarted` no hace nada explícito — `invalidatesTags` (que ya está declarado) sigue disparando el refetch normal como red de seguridad |
| Fix 2/3 — componente | `Modal` de `@aletheia/frontend-commons/src/ui/modal.tsx` (ya usado en `ReviewActionModal`) envolviendo `DocumentPreview` sin cambios |
| Fix 3 — performance | `useGetContractDocumentQuery` pasa a `skip: role !== 'APROBADOR' || !previewOpen` — ya no se piden todos los documentos de la cola a la vez |

## 6. Diseño detallado

### Fix 1 — `flujo-mf/src/features/_shared/flujo-api.ts`

Se agrega un tipo `WorkflowTransitionResult` (reemplaza el `unknown` actual de las 3 mutaciones)
y un `onQueryStarted` idéntico en `approveWorkflow`, `rejectWorkflow` y `returnWorkflow`:

```ts
export interface WorkflowTransitionResult {
  contractId: number;
  status: ContractStatus;
  stageId: number;
  stageName: string;
  enteredAt: string;
}
```

(Nota de plan: `flujoApi` se referencia dentro de sus propios endpoints — válido porque
`onQueryStarted` se ejecuta en tiempo de llamada, cuando `flujoApi` ya está completamente
asignado, no en tiempo de definición del módulo.)

Cada una de las 3 mutaciones (`approveWorkflow`, `rejectWorkflow`, `returnWorkflow`) agrega el
mismo bloque, con su propio `contractId` desestructurado de sus args:

```ts
async onQueryStarted({ contractId }, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled;
    dispatch(
      flujoApi.util.updateQueryData('listContracts', undefined, (draft) => {
        const c = draft.find((c) => c.id === contractId);
        if (c) c.status = data.status;
      }),
    );
  } catch {
    // La invalidación de tags ya declarada dispara un refetch normal si esto falla.
  }
},
```

### Fix 1 — `solicitudes-mf/src/features/_shared/api/contracts-api.ts`

`submitContract` gana el mismo patrón, pero parcheando **dos** cachés (la lista y el detalle),
porque `ContractDetailView.tsx` lee `useGetContractQuery(numericId)` directamente:

```ts
async onQueryStarted(id, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled;
    // La respuesta real es la de workflow-service ({ contractId, status, ... }), no el
    // BackendContract completo que declara el tipo de este mutation — solo `status` es
    // fiable aquí. (Inconsistencia de tipo preexistente, no introducida por este fix.)
    const status = (data as unknown as { status: BackendContract['status'] }).status;
    dispatch(
      contractsApi.util.updateQueryData('getContract', id, (draft) => {
        draft.status = status;
      }),
    );
    dispatch(
      contractsApi.util.updateQueryData('listContracts', undefined, (draft) => {
        const c = draft.find((c) => c.id === id);
        if (c) c.status = status;
      }),
    );
  } catch {}
},
```

### Fix 2 — `contratos-mf/.../ContractEditorView.tsx`

Reemplazar el bloque condicional `{showPreview ? <Card>...<DocumentPreview/></Card> : null}`
(líneas 369-384 actuales) por un `Modal`:

```tsx
<Modal
  open={showPreview}
  onClose={() => setShowPreview(false)}
  title="Vista previa del documento"
  description="Así se verá el contrato impreso o en PDF."
  className="max-w-3xl"
>
  <DocumentPreview body={body} header={header} footer={footer} pageSetup={pageSetup} />
</Modal>
```

El botón "Ver documento" pasa de alternar (`setShowPreview((v) => !v)`, con label
"Ocultar vista previa") a solo abrir (`setShowPreview(true)`), ya que cerrar ahora lo maneja el
propio `Modal` (Escape, click en backdrop, botón X). Se importa `Modal` desde
`@aletheia/frontend-commons` junto a los demás imports ya existentes de ese paquete.

### Fix 3 — `flujo-mf/.../ReviewContractCard.tsx`

Se agrega estado local `previewOpen` y se cambia el `skip` de
`useGetContractDocumentQuery` para no pedir el documento hasta que se abre el modal:

```tsx
const [previewOpen, setPreviewOpen] = useState(false);
const { data: contractDocument, isFetching: loadingDocument } = useGetContractDocumentQuery(
  Number(contract.id),
  { skip: role !== 'APROBADOR' || !previewOpen },
);
```

El bloque actual (líneas 100-113: `loadingDocument`/`contractDocument`/badge de "aún no
elaborado") se reemplaza por un botón "Ver contrato" (solo visible para `role === 'APROBADOR'`)
que abre el modal, y el modal en sí muestra los datos ya disponibles en la card (folio, sociedad,
proveedor) como `description`/encabezado, más el `DocumentPreview` o el aviso de "aún no
elaborado" dentro:

```tsx
{role === 'APROBADOR' ? (
  <Button variant="neutral" size="sm" onClick={() => setPreviewOpen(true)}>
    <Eye className="h-4 w-4" /> Ver contrato
  </Button>
) : null}

<Modal
  open={previewOpen}
  onClose={() => setPreviewOpen(false)}
  title={`Contrato ${contract.folio}`}
  description={`${contract.society} · ${contract.provider}`}
  className="max-w-3xl"
>
  {loadingDocument ? (
    <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
  ) : contractDocument ? (
    <DocumentPreview
      body={contractDocument.body}
      header={contractDocument.header}
      footer={contractDocument.footer}
      pageSetup={normalizePageSetup(contractDocument.pageSetup)}
    />
  ) : (
    <Badge variant="secondary">El Abogado aún no elabora el documento formal</Badge>
  )}
</Modal>
```

El botón se coloca donde hoy vive el bloque embebido, entre el indicador de SLA y la fila de
acciones (Aprobar/Devolver/Rechazar).

## 7. Manejo de errores

- Fix 1: si `queryFulfilled` rechaza (la mutación falló), el `catch` no hace nada — no hay nada
  que parchear, y el error ya lo maneja `ReviewPanel.handleConfirm`/`ContractDetailView` como
  hoy (mensaje de error, modal de acción sigue abierto).
- Fix 2/3: sin cambios en manejo de errores — `Modal` ya maneja apertura/cierre; los estados de
  carga/vacío del documento (`loadingDocument`, `contractDocument` null) se preservan igual,
  solo se mueven dentro del `Modal`.

## 8. Testing / verificación

- No hay framework de test para estas apps (confirmado en sesiones anteriores). Verificación:
  1. **Fix 1**: reproducir en vivo (como se hizo para diagnosticar) — aprobar/rechazar/devolver/
     enviar a revisión y confirmar que la card/badge cambia de estado **sin** recargar ni usar el
     botón "Actualizar".
  2. **Fix 2**: en `/contratos/elaborar`, clic en "Ver documento" → aparece el modal centrado,
     Escape/backdrop/X lo cierran.
  3. **Fix 3**: como Aprobador en Flujo de trabajo, confirmar que la card ya no trae el documento
     embebido, que aparece un botón "Ver contrato", que abrirlo dispara la petición del
     documento (no antes), y que el modal muestra folio/sociedad/proveedor + el documento o el
     aviso de "aún no elaborado" según corresponda.

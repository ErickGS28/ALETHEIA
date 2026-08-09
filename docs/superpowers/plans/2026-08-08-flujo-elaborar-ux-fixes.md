# Corrección de estado no actualizado + vistas previas en modal — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el bug donde el estado del contrato no se actualiza automáticamente tras Aprobar/Devolver/Rechazar/Enviar a revisión, y mover las vistas previas del documento (en `/contratos/elaborar` y en la card del Aprobador) a un `Modal` en vez de contenido embebido/inline.

**Architecture:** Fix 1 es un parche de caché de RTK Query (`onQueryStarted` + `updateQueryData`) en las mutaciones de transición de workflow, usando el estado que ya trae la respuesta síncrona de la mutación en vez de esperar el refetch de red disparado por `invalidatesTags`. Fix 2/3 reemplazan bloques condicionales inline por el componente `Modal` ya existente en `@aletheia/frontend-commons`, sin crear componentes nuevos.

**Tech Stack:** Next.js (App Router), RTK Query (Redux Toolkit), TypeScript, Biome (lint), `@aletheia/frontend-commons` (design system compartido).

## Global Constraints

- No se toca el backend (`workflow-service`, `contracts-service`, colas de BullMQ) — el fix del estado es 100% frontend (ver diseño §4, No-objetivos).
- No se crean componentes de modal nuevos — se reutiliza `Modal` de `apps/frontend/commons/src/ui/modal.tsx`.
- No hay framework de test automatizado en ningún workspace de frontend — la verificación es lint + build (type-check) + smoke check con `curl` sobre las rutas servidas por `web-shell` (puerto 4000) + verificación manual en navegador.
- Cada microfrontend tiene su propio store de Redux — un fix en `flujo-api.ts` no afecta a `solicitudes-mf` ni viceversa; cada uno se corrige por separado (Tasks 1 y 2).

---

### Task 1: Parchear el caché tras Aprobar/Devolver/Rechazar (flujo-mf)

**Files:**
- Modify: `apps/frontend/microfrontends/flujo-mf/src/features/_shared/flujo-api.ts`

**Interfaces:**
- Produces: `WorkflowTransitionResult` (tipo exportado, reemplaza el `unknown` actual de las 3 mutaciones) con forma `{ contractId: number; status: ContractStatus; stageId: number; stageName: string; enteredAt: string }`. No consumido por otras tasks de este plan.

- [ ] **Step 1: Agregar el tipo de respuesta de las mutaciones de transición**

En `apps/frontend/microfrontends/flujo-mf/src/features/_shared/flujo-api.ts`, busca:

```ts
interface WorkflowActionArgs {
  contractId: number;
  comment?: string;
}
```

Reemplázalo por (se agrega la interfaz nueva justo después):

```ts
interface WorkflowActionArgs {
  contractId: number;
  comment?: string;
}

/** Respuesta real de POST /workflow/:id/{approve,reject,return} — la devuelve workflow-service. */
export interface WorkflowTransitionResult {
  contractId: number;
  status: ContractStatus;
  stageId: number;
  stageName: string;
  enteredAt: string;
}
```

- [ ] **Step 2: Parchear el caché en `approveWorkflow`, `rejectWorkflow` y `returnWorkflow`**

Busca este bloque exacto (las 3 mutaciones seguidas):

```ts
    approveWorkflow: b.mutation<unknown, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/approve`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
    }),

    rejectWorkflow: b.mutation<unknown, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/reject`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
    }),

    returnWorkflow: b.mutation<unknown, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/return`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
    }),
```

Reemplázalo por:

```ts
    approveWorkflow: b.mutation<WorkflowTransitionResult, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/approve`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
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
    }),

    rejectWorkflow: b.mutation<WorkflowTransitionResult, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/reject`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
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
    }),

    returnWorkflow: b.mutation<WorkflowTransitionResult, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/return`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
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
    }),
```

- [ ] **Step 3: Lint y type-check**

Run: `pnpm --filter flujo-mf lint`
Expected: sin errores nuevos en `flujo-api.ts` (puede haber errores preexistentes de CRLF en otros archivos no tocados — ignóralos).

Run: `pnpm --filter flujo-mf build`
Expected: build exitoso, sin errores de TypeScript (`data.status` debe tipar correctamente como `ContractStatus` gracias al nuevo `WorkflowTransitionResult`).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/microfrontends/flujo-mf/src/features/_shared/flujo-api.ts
git commit -m "fix(flujo-mf): actualizar caché de contratos al instante tras aprobar/rechazar/devolver"
```

---

### Task 2: Parchear el caché tras Enviar a revisión (solicitudes-mf)

**Files:**
- Modify: `apps/frontend/microfrontends/solicitudes-mf/src/features/_shared/api/contracts-api.ts`

**Interfaces:**
- Consumes: nada de Task 1 (store de Redux independiente, otro microfrontend).

- [ ] **Step 1: Parchear el caché en `submitContract`**

Busca este bloque exacto:

```ts
    submitContract: b.mutation<BackendContract, number>({
      query: (id) => ({ url: `/contracts/${id}/submit`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
        { type: 'Workflow', id },
        { type: 'Report', id },
      ],
    }),
```

Reemplázalo por:

```ts
    submitContract: b.mutation<BackendContract, number>({
      query: (id) => ({ url: `/contracts/${id}/submit`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
        { type: 'Workflow', id },
        { type: 'Report', id },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // La respuesta real es la de workflow-service ({ contractId, status, ... }), no el
          // BackendContract completo que declara el tipo de este mutation — solo `status` es
          // fiable aquí. Inconsistencia de tipo preexistente, no introducida por este fix.
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
        } catch {
          // La invalidación de tags ya declarada dispara un refetch normal si esto falla.
        }
      },
    }),
```

- [ ] **Step 2: Lint y type-check**

Run: `pnpm --filter solicitudes-mf lint`
Expected: sin errores nuevos en `contracts-api.ts`.

Run: `pnpm --filter solicitudes-mf build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/microfrontends/solicitudes-mf/src/features/_shared/api/contracts-api.ts
git commit -m "fix(solicitudes-mf): actualizar caché de contrato al instante tras enviar a revisión"
```

---

### Task 3: Vista previa en modal — `/contratos/elaborar`

**Files:**
- Modify: `apps/frontend/microfrontends/contratos-mf/src/features/contract-editor/components/ContractEditorView.tsx`

**Interfaces:** Ninguna — cambio autocontenido de UI, no expone nada a otras tasks.

- [ ] **Step 1: Importar `Modal` y quitar `EyeOff`**

Busca:

```ts
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DEFAULT_PAGE_SETUP,
  DocumentPreview,
  PageHeader,
  type PageSetup,
  PageSetupControl,
  RichTextEditor,
  Select,
  normalizePageSetup,
  useRole,
  useToast,
} from '@aletheia/frontend-commons';
import { Eye, EyeOff, FileText, Save } from 'lucide-react';
```

Reemplázalo por:

```ts
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DEFAULT_PAGE_SETUP,
  DocumentPreview,
  Modal,
  PageHeader,
  type PageSetup,
  PageSetupControl,
  RichTextEditor,
  Select,
  normalizePageSetup,
  useRole,
  useToast,
} from '@aletheia/frontend-commons';
import { Eye, FileText, Save } from 'lucide-react';
```

- [ ] **Step 2: Cambiar el botón "Ver documento" para que solo abra (ya no alterna)**

Busca:

```tsx
                  <Button variant="neutral" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPreview ? 'Ocultar vista previa' : 'Ver documento'}
                  </Button>
```

Reemplázalo por:

```tsx
                  <Button variant="neutral" onClick={() => setShowPreview(true)}>
                    <Eye className="h-4 w-4" />
                    Ver documento
                  </Button>
```

- [ ] **Step 3: Mover la vista previa de una Card condicional a un Modal**

Busca este bloque exacto:

```tsx
            {showPreview ? (
              <Card>
                <CardHeader>
                  <CardTitle>Vista previa del documento</CardTitle>
                  <CardDescription>Así se verá el contrato impreso o en PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentPreview
                    body={body}
                    header={header}
                    footer={footer}
                    pageSetup={pageSetup}
                  />
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
```

Reemplázalo por (se quita la Card condicional del flujo normal; el modal se agrega después, junto a `ConfirmDialog`):

```tsx
          </>
        ) : (
```

Ahora busca el cierre del componente, este bloque exacto:

```tsx
      <ConfirmDialog
        open={pendingTemplateId !== null}
        title="Reemplazar contenido del documento"
        body="Esto reemplazará el contenido actual del documento, incluido el borrador sin guardar. ¿Deseas continuar?"
        confirmLabel="Reemplazar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={confirmApplyTemplate}
        onCancel={cancelApplyTemplate}
      />
    </main>
  );
}
```

Reemplázalo por:

```tsx
      <ConfirmDialog
        open={pendingTemplateId !== null}
        title="Reemplazar contenido del documento"
        body="Esto reemplazará el contenido actual del documento, incluido el borrador sin guardar. ¿Deseas continuar?"
        confirmLabel="Reemplazar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={confirmApplyTemplate}
        onCancel={cancelApplyTemplate}
      />

      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Vista previa del documento"
        description="Así se verá el contrato impreso o en PDF."
        className="max-w-3xl"
      >
        <DocumentPreview body={body} header={header} footer={footer} pageSetup={pageSetup} />
      </Modal>
    </main>
  );
}
```

- [ ] **Step 4: Lint y type-check**

Run: `pnpm --filter contratos-mf lint`
Expected: sin errores nuevos (confirma que `EyeOff` ya no quedó como import sin usar).

Run: `pnpm --filter contratos-mf build`
Expected: build exitoso.

- [ ] **Step 5: Verificación con el stack corriendo**

Si el stack ya está arriba (`pnpm dev:staged` u otro), confirma con:

Run: `curl -s http://localhost:4000/contratos/elaborar | grep -o 'Ver documento'`
Expected: al menos una coincidencia (el botón sigue existiendo con ese texto).

Run: `curl -s http://localhost:4000/contratos/elaborar | grep -c 'Ocultar vista previa'`
Expected: `0` (el texto de alternar ya no existe en el HTML servido).

- [ ] **Step 6: Verificación visual en navegador**

Como Abogado, entra a `/contratos/elaborar`, carga una plantilla (o un contrato con documento ya elaborado), da clic en **Ver documento** y confirma:
1. Aparece un modal centrado con la vista previa — no una card debajo de "Diseño de página".
2. Escape, clic en el fondo, o el botón X lo cierran.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/microfrontends/contratos-mf/src/features/contract-editor/components/ContractEditorView.tsx
git commit -m "fix(contratos-mf): mover vista previa del documento a un modal"
```

---

### Task 4: Vista previa en modal + carga perezosa — card del Aprobador en Flujo

**Files:**
- Modify: `apps/frontend/microfrontends/flujo-mf/src/features/review-panel/components/ReviewContractCard.tsx`

**Interfaces:** Ninguna — cambio autocontenido de UI. No depende de Task 1 (toca un archivo distinto de `flujo-api.ts`, aunque ambos viven en `flujo-mf`).

- [ ] **Step 1: Agregar imports (`useState`, `Modal`, `Eye`)**

Busca:

```tsx
'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
  DocumentPreview,
  normalizePageSetup,
} from '@aletheia/frontend-commons';
import type { Privilege, Role } from '@aletheia/frontend-commons';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckIcon,
  RejectIcon,
  ReturnIcon,
  TimelineIcon,
} from '../../../components/ui/icons';
```

Reemplázalo por:

```tsx
'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
  DocumentPreview,
  Modal,
  normalizePageSetup,
} from '@aletheia/frontend-commons';
import type { Privilege, Role } from '@aletheia/frontend-commons';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRightIcon,
  CheckIcon,
  RejectIcon,
  ReturnIcon,
  TimelineIcon,
} from '../../../components/ui/icons';
```

- [ ] **Step 2: Agregar el estado `previewOpen` y hacer perezosa la query del documento**

Busca:

```tsx
  const { sla, isError: slaError } = useContractWorkflow(contract.id);
  const { data: contractDocument, isFetching: loadingDocument } = useGetContractDocumentQuery(
    Number(contract.id),
    { skip: role !== 'APROBADOR' },
  );
  const privilege = ROLE_REVIEW_PRIVILEGE[role] as Privilege;
```

Reemplázalo por:

```tsx
  const { sla, isError: slaError } = useContractWorkflow(contract.id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: contractDocument, isFetching: loadingDocument } = useGetContractDocumentQuery(
    Number(contract.id),
    { skip: role !== 'APROBADOR' || !previewOpen },
  );
  const privilege = ROLE_REVIEW_PRIVILEGE[role] as Privilege;
```

- [ ] **Step 3: Reemplazar el bloque embebido por un botón + Modal**

Busca este bloque exacto:

```tsx
        {role !== 'APROBADOR' ? null : loadingDocument ? (
          <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
        ) : contractDocument ? (
          <div className="max-h-80 overflow-y-auto rounded-base border-2 border-border">
            <DocumentPreview
              body={contractDocument.body}
              header={contractDocument.header}
              footer={contractDocument.footer}
              pageSetup={normalizePageSetup(contractDocument.pageSetup)}
            />
          </div>
        ) : (
          <Badge variant="secondary">El Abogado aún no elabora el documento formal</Badge>
        )}
```

Reemplázalo por:

```tsx
        {role !== 'APROBADOR' ? null : (
          <Button variant="neutral" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Ver contrato
          </Button>
        )}
```

- [ ] **Step 4: Agregar el Modal antes del cierre del componente**

Busca el final del archivo, este bloque exacto:

```tsx
          <Link href={`/timeline?contract=${contract.id}`} className="ml-auto">
            <Button variant="link" size="sm">
              <TimelineIcon />
              Historial
              <ArrowRightIcon />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

Reemplázalo por:

```tsx
          <Link href={`/timeline?contract=${contract.id}`} className="ml-auto">
            <Button variant="link" size="sm">
              <TimelineIcon />
              Historial
              <ArrowRightIcon />
            </Button>
          </Link>
        </div>
      </CardContent>

      {role === 'APROBADOR' ? (
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
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 5: Lint y type-check**

Run: `pnpm --filter flujo-mf lint`
Expected: sin errores nuevos.

Run: `pnpm --filter flujo-mf build`
Expected: build exitoso.

- [ ] **Step 6: Verificación con el stack corriendo**

Run: `curl -s http://localhost:4000/flujo | grep -o 'Ver contrato'`
Expected: si hay contratos en la cola del rol actual con documento aplicable, aparece el texto del botón (si la cola está vacía para el rol de la sesión activa en el servidor, este check puede no aplicar — confirma con el Step 7 en navegador en su lugar).

- [ ] **Step 7: Verificación visual en navegador**

Como Aprobador, entra a **Flujo de trabajo** y confirma:
1. Las cards ya no muestran el documento embebido — aparece un botón **"Ver contrato"**.
2. Al hacer clic, se abre el modal con folio/sociedad/proveedor arriba y el documento (o el aviso de "aún no elaborado") debajo.
3. Antes de hacer clic, no se disparó ninguna petición a `/contracts/:id/document` para esa card (puedes confirmarlo con las herramientas de red del navegador si quieres verificar la carga perezosa).

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/microfrontends/flujo-mf/src/features/review-panel/components/ReviewContractCard.tsx
git commit -m "fix(flujo-mf): mover vista previa del documento a un modal con carga perezosa"
```

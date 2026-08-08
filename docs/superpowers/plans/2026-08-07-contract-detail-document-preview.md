# Contract Detail Document Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the real content of the contract's elaborated document (the one the Abogado writes from a template) inside the general contract detail view, which today only shows basic fields.

**Architecture:** A new presentational component `ContractDocumentCard` in `apps/frontend/commons/src/ui/` wraps the existing `DocumentPreview` with the loading/empty/content states already duplicated in `ReviewContractCard.tsx` and `SignatureCanvasView.tsx`. `solicitudes-mf` gets a new RTK Query endpoint (`getContractDocument`) mirroring the one already in `flujo-mf`'s and `firmas-mf`'s API slices, and `ContractDetailView.tsx` wires the two together.

**Tech Stack:** Next.js 15 / React 19, Redux Toolkit Query, Tailwind, `@aletheia/frontend-commons` workspace package (source-only, no build step — consumed directly by Next's TS compiler in each microfrontend).

## Global Constraints

- No backend changes — `GET /contracts/:id/document` already exists, is read-only, and has no role restriction.
- No changes to `ReviewContractCard.tsx` or `SignatureCanvasView.tsx` — out of scope per the approved design (`docs/plans/2026-08-07-contract-detail-document-preview-design.md`).
- The preview shows as soon as a document exists, regardless of contract status; before that, show the empty-state message, identical for every role (no role gating).
- Empty-state copy must be exactly `"El Abogado aún no elabora el documento formal"` (the text already used in `ReviewContractCard.tsx`), for consistency across the three screens.
- This repo has no frontend test runner configured (`commons/package.json` and each microfrontend's `package.json` only have `lint` and `build`/`dev` scripts — no `test` script, no `.test.tsx`/`.spec.tsx` files exist anywhere under `apps/frontend`). Verification in this plan uses `biome check` (lint) and `next build` (which type-checks the whole dependency graph, including `commons` source) — there is no unit-test step to add.

---

### Task 1: `ContractDocumentCard` shared component

**Files:**
- Create: `apps/frontend/commons/src/ui/contract-document-card.tsx`
- Modify: `apps/frontend/commons/src/index.ts:46` (add export line after the existing `export * from './ui/document-preview';`)

**Interfaces:**
- Consumes: `DocumentPreview` (`apps/frontend/commons/src/ui/document-preview.tsx`, props `{ body: string; header?: string; footer?: string; pageSetup: PageSetup; className?: string }`), `normalizePageSetup` and `type PageSetup` (`apps/frontend/commons/src/ui/page-setup.tsx`), `Card`/`CardHeader`/`CardTitle`/`CardContent` (`apps/frontend/commons/src/ui/card.tsx`), `Badge` (`apps/frontend/commons/src/ui/badge.tsx`).
- Produces: `ContractDocumentCard(props: ContractDocumentCardProps)` and `interface ContractDocumentCardProps { document: ContractDocumentPayload | null | undefined; isLoading: boolean }` and `interface ContractDocumentPayload { body: string; header?: string; footer?: string; pageSetup?: PageSetup }`, all exported from `@aletheia/frontend-commons` for Task 2 and Task 3 to import.

- [ ] **Step 1: Write the component**

Create `apps/frontend/commons/src/ui/contract-document-card.tsx`:

```tsx
'use client';

import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { DocumentPreview } from './document-preview';
import { type PageSetup, normalizePageSetup } from './page-setup';

export interface ContractDocumentPayload {
  body: string;
  header?: string;
  footer?: string;
  pageSetup?: PageSetup;
}

export interface ContractDocumentCardProps {
  document: ContractDocumentPayload | null | undefined;
  isLoading: boolean;
}

/**
 * Card showing the contract's elaborated document (written by the Abogado
 * from a template). Shared across every screen that needs to display it
 * read-only: loading / not-yet-elaborated / real content, in that order.
 */
export function ContractDocumentCard({ document, isLoading }: ContractDocumentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documento del contrato</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
        ) : document ? (
          <div className="max-h-80 overflow-y-auto rounded-base border-2 border-border">
            <DocumentPreview
              body={document.body}
              header={document.header}
              footer={document.footer}
              pageSetup={normalizePageSetup(document.pageSetup)}
            />
          </div>
        ) : (
          <Badge variant="secondary">El Abogado aún no elabora el documento formal</Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Export it from the commons barrel**

In `apps/frontend/commons/src/index.ts`, immediately after line 46 (`export * from './ui/document-preview';`), add:

```ts
export * from './ui/contract-document-card';
```

- [ ] **Step 3: Lint**

Run: `pnpm --filter @aletheia/frontend-commons lint`
Expected: no errors (Biome check passes).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/commons/src/ui/contract-document-card.tsx apps/frontend/commons/src/index.ts
git commit -m "feat(commons): add shared ContractDocumentCard component"
```

---

### Task 2: `getContractDocument` endpoint in solicitudes-mf

**Files:**
- Modify: `apps/frontend/microfrontends/solicitudes-mf/src/features/_shared/api/contracts-api.ts`

**Interfaces:**
- Consumes: `baseApi` (already imported at the top of the file, line 5), the existing `injectEndpoints` pattern used by every other endpoint in this file (e.g. `getContract` at line 32-35).
- Produces: `interface ContractDocument { body: string; header?: string; footer?: string; pageSetup?: unknown }` and `useGetContractDocumentQuery(id: number)` exported from `./contracts-api`, consumed by Task 3. `pageSetup` is typed `unknown` here (not `PageSetup`) because the raw API response is untrusted JSON — `ContractDocumentCard` (Task 1) already normalizes it via `normalizePageSetup`, matching how `FlujoContractDocument` and `SignatureContractDocument` type it in the other two microfrontends.

- [ ] **Step 1: Add the type and the endpoint**

In `apps/frontend/microfrontends/solicitudes-mf/src/features/_shared/api/contracts-api.ts`, add this interface right before `export const contractsApi = baseApi.injectEndpoints({` (line 18):

```ts
/** Documento elaborado del contrato (ver ContractDocumentCard en frontend-commons). */
export interface ContractDocument {
  body: string;
  header?: string;
  footer?: string;
  pageSetup?: unknown;
}
```

Then, inside the `endpoints: (b) => ({ ... })` block, add this endpoint right after `getWorkflow` (after line 93, before the `/* ─── Catalogs ─── */` comment on line 95):

```ts
    getContractDocument: b.query<ContractDocument | null, number>({
      query: (id) => `/contracts/${id}/document`,
      providesTags: (_r, _e, id) => [{ type: 'Document', id: `contract-${id}` }],
    }),
```

Finally, add `useGetContractDocumentQuery` to the destructured export block at the bottom of the file (after `useGetWorkflowQuery,` on line 121):

```ts
  useGetContractDocumentQuery,
```

- [ ] **Step 2: Lint**

Run: `pnpm --filter solicitudes-mf lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/microfrontends/solicitudes-mf/src/features/_shared/api/contracts-api.ts
git commit -m "feat(solicitudes-mf): add getContractDocument query"
```

---

### Task 3: Wire `ContractDocumentCard` into `ContractDetailView`

**Files:**
- Modify: `apps/frontend/microfrontends/solicitudes-mf/src/features/contract-detail/components/ContractDetailView.tsx`

**Interfaces:**
- Consumes: `ContractDocumentCard` (Task 1, from `@aletheia/frontend-commons`), `useGetContractDocumentQuery` (Task 2, from `../../_shared/api/contracts-api`), `contract.id` (already in scope in this component — same `contract` object used at lines 253-265 for `contract.folio`, `contract.society`, etc.).
- Produces: nothing consumed by later tasks — this is the final integration point.

- [ ] **Step 1: Add the imports**

In `apps/frontend/microfrontends/solicitudes-mf/src/features/contract-detail/components/ContractDetailView.tsx`, add `ContractDocumentCard` to the existing `@aletheia/frontend-commons` import block (lines 3-16), inserted alphabetically after `Card,` and before `CardContent,`:

```ts
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ContractDocumentCard,
  ErrorState,
```

Wait — `ContractDocumentCard` sorts after `CardTitle` alphabetically (`Card` < `CardContent` < `CardDescription` < `CardHeader` < `CardTitle` < `ContractDocumentCard`). Insert it right after `CardTitle,` and before `ErrorState,`.

Add `useGetContractDocumentQuery` to the existing import from `../../_shared/api/contracts-api` (lines 21-28), inserted alphabetically after `useGetAuditQuery,` and before `useGetContractQuery,`:

```ts
import {
  useCancelContractMutation,
  useGetAuditQuery,
  useGetContractDocumentQuery,
  useGetContractQuery,
  useGetWorkflowQuery,
  useRecoverContractMutation,
  useSubmitContractMutation,
} from '../../_shared/api/contracts-api';
```

- [ ] **Step 2: Fetch the document**

Find where `contract` becomes available in the component body (it's the loaded contract used to render "Datos generales" — search for where `useGetContractQuery` or equivalent is destructured, and where the JSX at line 253 `{contract.folio}` gets its `contract` from). Add this line in that same scope, before the `return (...)` that contains the JSX grid at line 245:

```ts
  const { data: document, isFetching: loadingDocument } = useGetContractDocumentQuery(
    contract.numericId,
  );
```

Use `contract.numericId`, not `contract.id`: `adaptContract` (`../../_shared/api/adapters.ts:8-11`) sets `id: String(c.id)` (stringified, used for routing/keys) and `numericId: c.id` (the raw numeric backend ID) — the same distinction this file already relies on at line 298 (`onConfirm={(reason) => handleCancel(contract.numericId, reason)}`). `getContractDocument` (Task 2) is typed `b.query<ContractDocument | null, number>`, so it needs the numeric form.

- [ ] **Step 3: Render the card**

In the JSX, insert the card between the "Datos generales" `Card` (closing at line 267) and the "Documentos requeridos" `Card` (opening at line 269):

```tsx
            </Card>

            <ContractDocumentCard document={document} isLoading={loadingDocument} />

            <Card>
              <CardHeader>
                <CardTitle>Documentos requeridos</CardTitle>
```

- [ ] **Step 4: Build (type-check)**

Run: `pnpm --filter solicitudes-mf build`
Expected: build succeeds with no TypeScript errors. This is the project's existing verification method for frontend changes in the absence of a test runner (see the 2026-07-31 changelog: `pnpm --filter flujo-mf build` was used the same way).

- [ ] **Step 5: Lint**

Run: `pnpm --filter solicitudes-mf lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/microfrontends/solicitudes-mf/src/features/contract-detail/components/ContractDetailView.tsx
git commit -m "feat(solicitudes-mf): show document preview in contract detail"
```

---

### Task 4: Manual E2E verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Start the dev stack**

Run: `pnpm dev` from the repo root (`ALETHEIA/`). Confirm the working directory is the real repo, not a stale worktree (`pwd` should not contain `wt-clm` or similar) — this exact mistake cost a full session on 2026-07-31.

- [ ] **Step 2: Verify the empty state**

Log in as Solicitante (or any role), open the detail of a contract that has **not** reached `ADMIN_REVIEW` yet (so no document has been elaborated). Confirm the "Documento del contrato" card shows the `Badge`: "El Abogado aún no elabora el documento formal".

- [ ] **Step 3: Verify the populated state**

As Abogado, open a contract in `ADMIN_REVIEW`, pick a template, edit it, and save (existing flow in `ContractEditorView.tsx` — unchanged by this plan). Then open that same contract's general detail view (as any role, including a role other than Abogado/Aprobador/Firmante if one exists) and confirm the "Documento del contrato" card now renders the real HTML content (header/body/footer) inside the scrollable preview, matching what `ReviewContractCard`/`SignatureCanvasView` already show elsewhere.

- [ ] **Step 4: Verify no regression on the other two screens**

Confirm `ReviewContractCard.tsx` (Aprobador review) and `SignatureCanvasView.tsx` (Firmante signing) still render their own document previews unchanged — this plan didn't touch either file, so this is a quick sanity check, not a deep test.

---

## Self-Review Notes

- **Spec coverage:** every decision in `docs/plans/2026-08-07-contract-detail-document-preview-design.md` maps to a task — shared component (Task 1), new endpoint (Task 2), integration + placement between "Datos generales" and "Documentos requeridos" (Task 3), no-backend-changes constraint respected (no backend task exists), manual E2E verification per the spec's Testing section (Task 4).
- **Verified against source:** Task 3 Step 2's `contract.numericId` vs `contract.id` choice was confirmed directly against `adaptContract` (`apps/frontend/microfrontends/solicitudes-mf/src/features/_shared/api/adapters.ts:8-11`) rather than left as a guess.
- **Type consistency:** `ContractDocumentPayload` (Task 1) and `ContractDocument` (Task 2) are deliberately two separate types — matching the existing repo convention where `flujo-mf` (`FlujoContractDocument`) and `firmas-mf` (`SignatureContractDocument`) each define their own local type for the same wire shape, rather than sharing one. `ContractDocumentCard`'s prop type (`ContractDocumentPayload`) is structurally compatible with `ContractDocument` (both `{ body: string; header?: string; footer?: string; pageSetup?: ... }`), so passing one where the other is expected type-checks without casting.

# Conectar plantillas con el flujo de revisión — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El documento formal que el Abogado elabora a partir de una plantilla durante `LAWYER_REVIEW` deja de ser un callejón sin salida: solo el Abogado puede escribirlo (y solo en su etapa), no se puede aprobar sin haberlo elaborado, y Aprobador/Firmante lo ven antes de decidir/firmar.

**Architecture:** Cambios acotados al gateway (dos controllers ya existentes) y a tres microfrontends (`contratos-mf`, `flujo-mf`, `firmas-mf`), todos consumiendo los endpoints `GET/PUT /contracts/:id/document` que ya existen. No se toca el state machine de `workflow-service` ni el schema de Prisma — el storage del documento sigue siendo el archivo plano vía `FileStorageService` del gateway.

**Tech Stack:** NestJS (gateway), Next.js 15 + RTK Query (microfrontends), `@aletheia/frontend-commons` (`DocumentPreview`, `useRole`), `@aletheia/backend-commons` (patterns Redis).

## Global Constraints

- **Sin framework de pruebas automatizadas:** se verificó que ni el gateway ni ningún microservicio (`auth-service`, `contracts-service`, `documents-service`, `workflow-service`) tienen Jest/`@nestjs/testing` instalado, y ningún microfrontend tiene Vitest/Jest configurado — es un vacío consistente en todo el repo, no un descuido de un paquete. Por eso este plan reemplaza los pasos de TDD automatizado por verificación manual con `curl` (backend) y recorrido manual en el navegador (frontend), siguiendo el mismo patrón de verificación que ya se usó en las sesiones anteriores de este proyecto. Si en el futuro se agrega un framework de pruebas al repo, es un cambio aparte — no se introduce aquí como efecto colateral de esta feature.
- Scopes de commit válidos (commitlint): `contracts`, `workflow`, `contratos-mf`, `flujo-mf`, `firmas-mf` (los que usa este plan) — ver `commitlint.config.cjs` para la lista completa.
- El gateway corre en `localhost:3001` (`pnpm dev` desde la raíz, o `pnpm --filter @aletheia/gateway dev`). Swagger en `localhost:3001/api/docs`.
- Usuarios demo: `abogado@aletheia.com` / `password123` (rol ABOGADO), `aprobador@aletheia.com` / `password123`, `firmante@aletheia.com` / `password123` — todos con `areaId: 1`. Ver `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md`.

---

### Task 1: Restringir quién puede escribir el documento elaborado, abrir la lectura

**Files:**
- Create: `apps/backend/gateway/src/documents/storage/contract-document-key.util.ts`
- Modify: `apps/backend/gateway/src/contracts/contracts.controller.ts`

**Interfaces:**
- Produces: `contractDocumentKey(contractId: number): string` — export nombrado, usado también por Task 2.
- Consumes: `WORKFLOW_PATTERNS.GET` (ya existe, devuelve `{ contractId, status, stage, enteredAt, sla, transitions }`), `SERVICE_CLIENTS.WORKFLOW` (ya inyectado en `ContractsController`).

- [ ] **Step 1: Extraer `contractDocumentKey` a un util compartido**

Hoy vive como `const` local en `contracts.controller.ts` (línea 31). Task 2 la necesita también en `workflow.controller.ts`, así que se saca a su propio archivo antes de tocar el resto.

```typescript
// apps/backend/gateway/src/documents/storage/contract-document-key.util.ts

/** Deterministic storage key for a contract's elaborated document (JSON). */
export function contractDocumentKey(contractId: number): string {
  return `contract-document-${contractId}.json`;
}
```

- [ ] **Step 2: Usar el util en `contracts.controller.ts` y quitar la constante local**

En `apps/backend/gateway/src/contracts/contracts.controller.ts`, reemplaza:

```typescript
/** Deterministic storage key for a contract's elaborated document (JSON). */
const contractDocumentKey = (contractId: number) => `contract-document-${contractId}.json`;
```

por un import:

```typescript
import { contractDocumentKey } from '../documents/storage/contract-document-key.util';
```

- [ ] **Step 3: Restringir `PUT :id/document` a Abogado + contrato en `LAWYER_REVIEW`**

En el mismo archivo, reemplaza el método `saveDocument` completo:

```typescript
  @Put(':id/document')
  @ApiOperation({ summary: 'Guardar el documento elaborado (HTML/diseño) de un contrato' })
  async saveDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveContractDocumentDto,
    @CurrentUser() user: UserContext,
  ) {
    if (!user.roles.includes('ABOGADO')) {
      throw new ForbiddenException('Solo el Abogado puede elaborar el documento formal.');
    }
    const workflow = await firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.GET, { contractId: id }),
    );
    if (workflow.status !== 'LAWYER_REVIEW') {
      throw new BadRequestException(
        'El contrato debe estar en Revisión Legal para elaborar su documento.',
      );
    }
    const document: SaveContractDocumentDto = {
      body: dto.body,
      header: dto.header ?? '',
      footer: dto.footer ?? '',
      pageSetup: dto.pageSetup,
    };
    const { fileUrl } = await this.storage.saveText(
      contractDocumentKey(id),
      JSON.stringify(document),
    );
    return { fileUrl, savedAt: new Date().toISOString() };
  }
```

Nota: se quitó el decorador `@RequirePrivilege('CONTRACT_EDIT')` que tenía antes — la validación de rol+etapa ahora vive dentro del método, porque `@RequirePrivilege` solo puede comprobar privilegios planos, no "rol Y estado del contrato".

- [ ] **Step 4: Abrir `GET :id/document` a cualquier usuario autenticado**

Reemplaza el método `getDocument`:

```typescript
  @Get(':id/document')
  @ApiOperation({ summary: 'Obtener el documento elaborado (HTML/diseño) de un contrato' })
  async getDocument(@Param('id', ParseIntPipe) id: number) {
    const raw = await this.storage.readText(contractDocumentKey(id));
    // Null when never saved — the editor treats it as an empty draft.
    return raw ? (JSON.parse(raw) as SaveContractDocumentDto) : null;
  }
```

(El cuerpo no cambia — solo se quita el decorador `@RequirePrivilege('CONTRACT_EDIT')` que tenía antes, para que Aprobador/Firmante, que no tienen ese privilegio, puedan leerlo. Mismo patrón que ya usa `findOne` en este archivo: sin `@RequirePrivilege`, solo requiere estar autenticado — lo impone el `JwtAuthGuard` global.)

- [ ] **Step 5: Agregar los imports que faltan**

Al inicio de `contracts.controller.ts`, añade `BadRequestException` y `ForbiddenException` al import existente de `@nestjs/common`:

```typescript
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
```

- [ ] **Step 6: Verificar que compila**

Run: `pnpm --filter @aletheia/gateway build`
Expected: `nest build` termina sin errores de TypeScript.

- [ ] **Step 7: Verificar manualmente con curl**

Con el gateway corriendo (`pnpm dev` desde la raíz, o al menos `gateway` + `auth-service` + `contracts-service` + `workflow-service`), y un contrato de prueba en `LAWYER_REVIEW` (usa el manual QA §8 para llevar uno hasta ahí, o pídele el id a un contrato ya sembrado en ese estado):

```bash
# Login como abogado
ABOGADO_TOKEN=$(curl -s -X POST localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abogado@aletheia.com","password":"password123"}' | jq -r .data.accessToken)

# Login como solicitante (para probar que YA NO puede guardar)
SOLICITANTE_TOKEN=$(curl -s -X POST localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"solicitante@aletheia.com","password":"password123"}' | jq -r .data.accessToken)

CONTRACT_ID=<id de un contrato en LAWYER_REVIEW>

# 1. Solicitante intenta guardar el documento -> debe fallar con 403
curl -s -o /dev/null -w "%{http_code}\n" -X PUT "localhost:3001/contracts/$CONTRACT_ID/document" \
  -H "Authorization: Bearer $SOLICITANTE_TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"<p>intento no autorizado</p>"}'
# Expected: 403

# 2. Abogado guarda el documento -> debe funcionar
curl -s -X PUT "localhost:3001/contracts/$CONTRACT_ID/document" \
  -H "Authorization: Bearer $ABOGADO_TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"<p>Contenido formal del contrato</p>","header":"","footer":"","pageSetup":{"size":"LETTER","margins":{"top":1,"right":1,"bottom":1,"left":1}}}'
# Expected: 200 con { fileUrl, savedAt }

# 3. Cualquiera puede leerlo (usando el token de solicitante)
curl -s "localhost:3001/contracts/$CONTRACT_ID/document" \
  -H "Authorization: Bearer $SOLICITANTE_TOKEN" | jq .data.body
# Expected: "<p>Contenido formal del contrato</p>"
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/gateway/src/documents/storage/contract-document-key.util.ts apps/backend/gateway/src/contracts/contracts.controller.ts
git commit -m "fix(contracts): restrict document write to Abogado in LAWYER_REVIEW, open read"
```

---

### Task 2: Bloquear la aprobación del Abogado sin documento elaborado

**Files:**
- Modify: `apps/backend/gateway/src/workflow/workflow.module.ts`
- Modify: `apps/backend/gateway/src/workflow/workflow.controller.ts`

**Interfaces:**
- Consumes: `contractDocumentKey` (de Task 1, `apps/backend/gateway/src/documents/storage/contract-document-key.util.ts`), `FileStorageService.readText(key: string): Promise<string | null>` (ya existe), `WORKFLOW_PATTERNS.GET` (ya existe).

- [ ] **Step 1: Registrar `FileStorageService` como provider de `WorkflowModule`**

`apps/backend/gateway/src/workflow/workflow.module.ts` completo:

```typescript
import { Module } from '@nestjs/common';
import { FileStorageService } from '../documents/storage/file-storage.service';
import { WorkflowController } from './workflow.controller';

@Module({
  controllers: [WorkflowController],
  providers: [FileStorageService],
})
export class WorkflowModule {}
```

- [ ] **Step 2: Inyectar `FileStorageService` en `WorkflowController` y validar antes de aprobar**

En `apps/backend/gateway/src/workflow/workflow.controller.ts`, agrega los imports:

```typescript
import { BadRequestException, Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { FileStorageService } from '../documents/storage/file-storage.service';
import { contractDocumentKey } from '../documents/storage/contract-document-key.util';
```

Actualiza el constructor:

```typescript
  constructor(
    @Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy,
    private readonly storage: FileStorageService,
  ) {}
```

Y reemplaza el método `approve`:

```typescript
  @Post(':contractId/approve')
  @ApiOperation({ summary: 'Aprobar (el privilegio lo valida el State Machine)' })
  async approve(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() body: TransitionDto,
    @CurrentUser() user: UserContext,
  ) {
    const workflow = await firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.GET, { contractId }),
    );
    if (workflow.status === 'LAWYER_REVIEW') {
      const doc = await this.storage.readText(contractDocumentKey(contractId));
      if (!doc) {
        throw new BadRequestException(
          'Elabora el documento formal del contrato antes de aprobarlo.',
        );
      }
    }
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId,
        action: 'APPROVE',
        comment: body.comment,
        user,
      }),
    );
  }
```

(Solo `approve` cambia — `reject`/`return` no requieren documento, tiene sentido poder devolver o rechazar aunque el Abogado no haya redactado nada todavía.)

- [ ] **Step 3: Verificar que compila**

Run: `pnpm --filter @aletheia/gateway build`
Expected: sin errores de TypeScript.

- [ ] **Step 4: Verificar manualmente con curl**

Usa un contrato en `LAWYER_REVIEW` que **no** tenga documento guardado todavía (uno recién llegado a esa etapa, antes de correr el Step 7 de Task 1 sobre él):

```bash
ABOGADO_TOKEN=$(curl -s -X POST localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abogado@aletheia.com","password":"password123"}' | jq -r .data.accessToken)

CONTRACT_ID=<id de un contrato en LAWYER_REVIEW SIN documento guardado>

# 1. Aprobar sin documento -> debe fallar con 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST "localhost:3001/workflow/$CONTRACT_ID/approve" \
  -H "Authorization: Bearer $ABOGADO_TOKEN" -H "Content-Type: application/json" -d '{}'
# Expected: 400

# 2. Guarda el documento (como en Task 1 Step 7.2), luego reintenta aprobar -> debe funcionar
curl -s -o /dev/null -w "%{http_code}\n" -X POST "localhost:3001/workflow/$CONTRACT_ID/approve" \
  -H "Authorization: Bearer $ABOGADO_TOKEN" -H "Content-Type: application/json" -d '{}'
# Expected: 200/201, y el contrato pasa a APPROVAL_PENDING
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/gateway/src/workflow/workflow.module.ts apps/backend/gateway/src/workflow/workflow.controller.ts
git commit -m "fix(workflow): block Abogado's approve when no document was elaborated"
```

---

### Task 3: Restringir el editor de "Elaborar documento" a Abogado + `LAWYER_REVIEW`

**Files:**
- Modify: `apps/frontend/microfrontends/contratos-mf/src/features/contract-editor/components/ContractEditorView.tsx`

**Interfaces:**
- Consumes: `useRole()` → `{ role: Role | null, can, ready }` de `@aletheia/frontend-commons` (`role` es el string exacto, ej. `'ABOGADO'`); `BackendContract.status` de `templatesApi.ts` (ya tipado como `string`, valor real es uno de los `ContractStatus`).

- [ ] **Step 1: Cambiar el gate de acceso de privilegio a rol**

En `ContractEditorView.tsx`, reemplaza:

```typescript
  const canAccess = can('TEMPLATES_MANAGE') || can('CONTRACT_EDIT');
  if (!canAccess) {
    return <NoAccess title="Elaborar documento" />;
  }
```

por:

```typescript
  const canAccess = role === 'ABOGADO';
  if (!canAccess) {
    return <NoAccess title="Elaborar documento" />;
  }
```

En la línea 56, cambia:

```typescript
  const { can } = useRole();
```

por:

```typescript
  const { role } = useRole();
```

(`can` no se usa en ningún otro lugar de este archivo — es seguro reemplazarlo por completo.)

- [ ] **Step 2: Filtrar el selector de contratos a solo `LAWYER_REVIEW`**

Busca dónde se arma la lista de contratos elegibles para el selector (`useMemo(() => contractsData ?? [], [contractsData])` o similar) y agrega el filtro por estado:

```typescript
  const contracts = useMemo(
    () => (contractsData ?? []).filter((c) => c.status === 'LAWYER_REVIEW'),
    [contractsData],
  );
```

- [ ] **Step 3: Verificar que compila**

Run: `pnpm --filter contratos-mf build`
Expected: `next build` compila y tipa sin errores.

- [ ] **Step 4: Verificar manualmente en el navegador**

1. Entra como `solicitante@aletheia.com` a `/plantillas` → `/elaborar` (o navega directo a la ruta): debe mostrar "Sin acceso" (`NoAccess`).
2. Entra como `abogado@aletheia.com` a la misma ruta: el selector de contratos solo debe listar los que están en `LAWYER_REVIEW` — confirma contra `/flujo` que no aparecen contratos en otros estados.
3. Elabora y guarda un documento para uno de ellos — debe funcionar igual que antes.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/microfrontends/contratos-mf/src/features/contract-editor/components/ContractEditorView.tsx
git commit -m "fix(contratos-mf): gate Elaborar documento to Abogado + LAWYER_REVIEW contracts"
```

---

### Task 4: Mostrar el documento elaborado en la card de revisión (Aprobador)

**Files:**
- Modify: `apps/frontend/microfrontends/flujo-mf/src/features/_shared/flujo-api.ts`
- Modify: `apps/frontend/microfrontends/flujo-mf/src/features/review-panel/components/ReviewContractCard.tsx`

**Interfaces:**
- Produces: `useGetContractDocumentQuery(contractId: number, opts?) → { data: FlujoContractDocument | null, isFetching, isError }` — hook nuevo en `flujo-api.ts`, mismo shape que el ya existente en `contratos-mf/templatesApi.ts`.
- Consumes: `DocumentPreview` de `@aletheia/frontend-commons` (`{ body, header?, footer?, pageSetup }`), `PageSetup`/`DEFAULT_PAGE_SETUP` de `@aletheia/frontend-commons`.

- [ ] **Step 1: Agregar el endpoint de documento a `flujo-api.ts`**

En `apps/frontend/microfrontends/flujo-mf/src/features/_shared/flujo-api.ts`, agrega el tipo y el endpoint (mismo patrón que `contratos-mf/src/features/api/templatesApi.ts`):

```typescript
import { type PageSetup, baseApi } from '@aletheia/frontend-commons';

export interface FlujoContractDocument {
  body: string;
  header?: string;
  footer?: string;
  pageSetup?: PageSetup;
}
```

(Cambia el import existente `import { baseApi } from '@aletheia/frontend-commons';` por el de arriba, que agrega `PageSetup`.)

Dentro de `endpoints: (b) => ({ ... })`, agrega junto a los demás:

```typescript
    getContractDocument: b.query<FlujoContractDocument | null, number>({
      query: (id) => ({ url: `/contracts/${id}/document` }),
      providesTags: (_res, _err, id) => [{ type: 'Document', id: `contract-${id}` }],
    }),
```

Y en el export final, agrega el hook:

```typescript
export const {
  useListContractsQuery,
  useGetWorkflowQuery,
  useApproveWorkflowMutation,
  useRejectWorkflowMutation,
  useReturnWorkflowMutation,
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetContractDocumentQuery,
} = flujoApi;
```

- [ ] **Step 2: Normalizar `pageSetup` (puede venir incompleto o ausente)**

En `ReviewContractCard.tsx`, agrega antes del componente (mismo criterio que `normalizePageSetup` en `contratos-mf/ContractEditorView.tsx`, pero acotado a lo que `DocumentPreview` necesita):

```typescript
import { DEFAULT_PAGE_SETUP, DocumentPreview, type PageSetup } from '@aletheia/frontend-commons';
import { useGetContractDocumentQuery } from '../../_shared/flujo-api';

function normalizePageSetup(raw: PageSetup | undefined): PageSetup {
  const fallback = DEFAULT_PAGE_SETUP;
  const margins = raw?.margins ?? fallback.margins;
  return {
    size: raw?.size === 'LETTER' || raw?.size === 'A4' ? raw.size : fallback.size,
    margins: {
      top: typeof margins.top === 'number' ? margins.top : fallback.margins.top,
      right: typeof margins.right === 'number' ? margins.right : fallback.margins.right,
      bottom: typeof margins.bottom === 'number' ? margins.bottom : fallback.margins.bottom,
      left: typeof margins.left === 'number' ? margins.left : fallback.margins.left,
    },
  };
}
```

- [ ] **Step 3: Mostrar el documento dentro de la card**

Dentro del componente `ReviewContractCard`, agrega el fetch (junto al `useContractWorkflow` existente):

```typescript
  const { data: document, isFetching: loadingDocument } = useGetContractDocumentQuery(
    Number(contract.id),
  );
```

Y en el JSX, dentro de `CardContent`, después del bloque del SLA (`{sla ? (...) : ...}`) y antes del `<div className="mt-auto ...">` de las acciones, agrega:

```typescript
        {loadingDocument ? (
          <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
        ) : document ? (
          <div className="max-h-64 overflow-y-auto rounded-base border-2 border-border">
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
```

- [ ] **Step 4: Verificar que compila**

Run: `pnpm --filter flujo-mf build`
Expected: sin errores de TypeScript.

- [ ] **Step 5: Verificar manualmente en el navegador**

1. Entra como `aprobador@aletheia.com` a `/` (Flujo de trabajo). Un contrato en `LAWYER_REVIEW` **sin** documento guardado debe mostrar el badge "El Abogado aún no elabora el documento formal".
2. Con el mismo contrato ya con documento guardado (Task 1/2), recarga: debe mostrarse la vista previa del documento dentro de la card.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/microfrontends/flujo-mf/src/features/_shared/flujo-api.ts apps/frontend/microfrontends/flujo-mf/src/features/review-panel/components/ReviewContractCard.tsx
git commit -m "feat(flujo-mf): show elaborated document in the Aprobador's review card"
```

---

### Task 5: Mostrar el documento elaborado antes de firmar (Firmante)

**Files:**
- Modify: `apps/frontend/microfrontends/firmas-mf/src/features/signatures/api/signaturesApi.ts`
- Modify: `apps/frontend/microfrontends/firmas-mf/src/features/signature-canvas/components/SignatureCanvasView.tsx`

**Interfaces:**
- Produces: `useGetContractDocumentQuery(contractId: number, opts?) → { data: SignatureContractDocument | null, isFetching }` — hook nuevo en `signaturesApi.ts`.
- Consumes: `DocumentPreview`, `DEFAULT_PAGE_SETUP`, `PageSetup` de `@aletheia/frontend-commons` (mismos que Task 4).

- [ ] **Step 1: Agregar el endpoint de documento a `signaturesApi.ts`**

En `apps/frontend/microfrontends/firmas-mf/src/features/signatures/api/signaturesApi.ts`, cambia el import inicial:

```typescript
import { type PageSetup, baseApi } from '@aletheia/frontend-commons';
```

Agrega el tipo (junto a los demás, ej. después de `Signature`):

```typescript
export interface SignatureContractDocument {
  body: string;
  header?: string;
  footer?: string;
  pageSetup?: PageSetup;
}
```

Dentro de `endpoints: (b) => ({ ... })`, agrega:

```typescript
    getContractDocument: b.query<SignatureContractDocument | null, number | string>({
      query: (id) => `/contracts/${id}/document`,
      providesTags: (_res, _err, id) => [{ type: 'Document', id: `contract-${id}` }],
    }),
```

Y en el export final:

```typescript
export const {
  useListContractsQuery,
  useGetContractQuery,
  useListApoderadosQuery,
  useListSignaturesQuery,
  useCreateSignatureMutation,
  useGetContractDocumentQuery,
} = signaturesApi;
```

- [ ] **Step 2: Mostrar el documento en `SignatureCanvasView` antes del lienzo**

En `apps/frontend/microfrontends/firmas-mf/src/features/signature-canvas/components/SignatureCanvasView.tsx`, agrega al import de `@aletheia/frontend-commons`:

```typescript
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
  DEFAULT_PAGE_SETUP,
  DocumentPreview,
  Label,
  LoadingState,
  type PageSetup,
  Select,
  useToast,
} from '@aletheia/frontend-commons';
```

Y al import de `signaturesApi`:

```typescript
import {
  useCreateSignatureMutation,
  useGetContractDocumentQuery,
  useGetContractQuery,
  useListApoderadosQuery,
} from '../../signatures/api/signaturesApi';
```

Agrega la misma función `normalizePageSetup` de Task 4 Step 2 (antes del componente):

```typescript
function normalizePageSetup(raw: PageSetup | undefined): PageSetup {
  const fallback = DEFAULT_PAGE_SETUP;
  const margins = raw?.margins ?? fallback.margins;
  return {
    size: raw?.size === 'LETTER' || raw?.size === 'A4' ? raw.size : fallback.size,
    margins: {
      top: typeof margins.top === 'number' ? margins.top : fallback.margins.top,
      right: typeof margins.right === 'number' ? margins.right : fallback.margins.right,
      bottom: typeof margins.bottom === 'number' ? margins.bottom : fallback.margins.bottom,
      left: typeof margins.left === 'number' ? margins.left : fallback.margins.left,
    },
  };
}
```

El componente ya tiene `const { data: contract, isLoading: loadingContract, isError: errorContract } = useGetContractQuery(contractId);` — no lo toques. Justo después, agrega la nueva query (nombrada `contractDocument` para no chocar con la `contract` existente):

```typescript
  const { data: contractDocument, isFetching: loadingDocument } = useGetContractDocumentQuery(
    contractId,
  );
```

En el JSX, dentro del `<Card>` de la rama `contract.status === 'SIGNING'`, después del `<CardHeader>` y antes del `<CardContent>` con el formulario de apoderado/firma, agrega un bloque nuevo:

```typescript
              {loadingDocument ? (
                <CardContent className="pt-0">
                  <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
                </CardContent>
              ) : contractDocument ? (
                <CardContent className="pt-0">
                  <div className="max-h-80 overflow-y-auto rounded-base border-2 border-border">
                    <DocumentPreview
                      body={contractDocument.body}
                      header={contractDocument.header}
                      footer={contractDocument.footer}
                      pageSetup={normalizePageSetup(contractDocument.pageSetup)}
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="pt-0">
                  <Badge variant="secondary">Este contrato no tiene documento formal elaborado</Badge>
                </CardContent>
              )}
```

- [ ] **Step 3: Verificar que compila**

Run: `pnpm --filter firmas-mf build`
Expected: sin errores de TypeScript.

- [ ] **Step 4: Verificar manualmente en el navegador**

1. Entra como `firmante@aletheia.com`, abre un contrato en `SIGNING` con documento ya elaborado (llévalo hasta ahí siguiendo el manual QA §8): debe mostrarse la vista previa arriba del lienzo de firma, antes de dibujar/guardar.
2. Con un contrato en `SIGNING` sin documento (si existe alguno): debe mostrarse el badge "no tiene documento formal elaborado" y el lienzo debe seguir funcionando igual (no se bloquea la firma por esto — la validación dura está en Task 2, en la aprobación previa del Abogado, no aquí).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/microfrontends/firmas-mf/src/features/signatures/api/signaturesApi.ts apps/frontend/microfrontends/firmas-mf/src/features/signature-canvas/components/SignatureCanvasView.tsx
git commit -m "feat(firmas-mf): show elaborated document before signing"
```

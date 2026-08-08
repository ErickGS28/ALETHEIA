# Diseño: preview del documento en el detalle general del contrato

## Contexto

La sesión del 2026-07-31 conectó las plantillas del editor con el flujo de revisión: el Abogado elabora el documento formal desde una plantilla durante `ADMIN_REVIEW`, y tanto el Aprobador (`ReviewContractCard.tsx`, flujo-mf) como el Firmante (`SignatureCanvasView.tsx`, firmas-mf) ya ven el contenido real (HTML) de ese documento en sus propias pantallas de acción antes de decidir o firmar.

Lo que falta: la vista general de detalle de contrato (`ContractDetailView.tsx`, solicitudes-mf) — a la que llega cualquier rol para consultar un contrato fuera del flujo de aprobar/firmar — solo muestra información básica (folio, sociedad, área, proveedor, fechas), la lista de documentos requeridos (catálogo informativo, no contenido real) y la bitácora. No muestra el contenido del documento elaborado. Este es el hueco que cierra este trabajo.

## Alcance

- Agregar el preview del documento a `ContractDetailView.tsx`.
- Extraer un componente presentacional compartido (`ContractDocumentCard`) para el patrón de loading/vacío/preview que hoy ya está duplicado en `ReviewContractCard.tsx` y `SignatureCanvasView.tsx`, y que este nuevo uso también necesita.
- **Fuera de alcance:** migrar `ReviewContractCard.tsx` y `SignatureCanvasView.tsx` a usar el componente compartido (quedan como están; es una mejora aparte para no mezclar refactor de código que ya funciona con la feature nueva). Cambios de backend o de modelo de datos (`Template`/`Document` siguen sin relación formal en BD). Restricciones de rol adicionales sobre el documento (el endpoint ya es de solo lectura sin restricción de rol).

## Decisiones de diseño

1. **Visibilidad por estado:** el preview se muestra en cuanto existe un documento guardado, sin importar el estado actual del contrato (`ADMIN_REVIEW`, `APPROVAL_PENDING`, `SIGNING`, `SIGNED`, etc.). Antes de que exista, se muestra el mismo mensaje de "aún no elaborado" que ya usan las otras dos pantallas.
2. **Visibilidad por rol:** igual para todos los roles que acceden al detalle — es de solo lectura y el dato no es sensible por rol, así que no se agrega ningún gate nuevo.
3. **Ubicación en el layout:** card propia, titulada "Documento del contrato", insertada entre la card "Datos generales" y la card "Documentos requeridos" en `ContractDetailView.tsx`.
4. **Reutilización:** se extrae `ContractDocumentCard` como componente **presentacional puro** (no hace fetch) a `commons/src/ui/`, junto a `DocumentPreview` (que ya vive ahí). Cada microfrontend sigue haciendo su propio fetch vía su propio `baseApi` inyectado — cada uno es una app de module federation independiente con su propio store, así que no tiene sentido centralizar el fetching entre ellas. `ContractDocumentCard` solo recibe el resultado ya resuelto (`document`, `isLoading`) y decide qué pintar.

## Componentes

### `ContractDocumentCard` (nuevo — `apps/frontend/commons/src/ui/contract-document-card.tsx`)

```
interface ContractDocumentCardProps {
  document: { body: string; header?: string; footer?: string; pageSetup?: PageSetup } | null | undefined;
  isLoading: boolean;
}
```

- `isLoading` → texto `"Cargando documento…"` (mismo texto que ya usa `ReviewContractCard`).
- `!document` (ni cargando ni presente) → `Badge variant="secondary"` con el texto `"El Abogado aún no elabora el documento formal"` (reutiliza el texto existente, no uno nuevo).
- `document` presente → `<DocumentPreview body={...} header={...} footer={...} pageSetup={normalizePageSetup(document.pageSetup)} />`, envuelto en el mismo contenedor `max-h-80 overflow-y-auto rounded-base border-2 border-border` que ya usa `ReviewContractCard`.
- Todo esto envuelto en `Card` / `CardHeader` con `CardTitle`: "Documento del contrato", para funcionar como sección independiente.
- Se exporta desde el barrel de `commons/src/ui` (o `commons/src/index.ts`, siguiendo cómo ya se exporta `DocumentPreview`).

### `contracts-api.ts` (solicitudes-mf) — nuevo endpoint

Mismo patrón que `getContractDocument` en `flujo-mf/src/features/_shared/flujo-api.ts`:

```ts
getContractDocument: b.query<ContractDocument | null, number>({
  query: (id) => `/contracts/${id}/document`,
  providesTags: (_r, _e, id) => [{ type: 'Document', id: `contract-${id}` }],
}),
```

Exporta `useGetContractDocumentQuery`. El tipo `ContractDocument` se define localmente en `contracts-api.ts` (o se importa si `commons` ya expone uno equivalente — verificar en implementación; si no existe, replicar la forma de `FlujoContractDocument`). `'Document'` ya está registrado en `tagTypes` de `baseApi` (`commons/src/api/base-api.ts`), así que no requiere cambios ahí.

### `ContractDetailView.tsx` (solicitudes-mf) — integración

- `const { data: document, isFetching } = useGetContractDocumentQuery(Number(contract.id));` (sin `skip`).
- Renderiza `<ContractDocumentCard document={document} isLoading={isFetching} />` entre la card "Datos generales" (línea ~250-266) y la card "Documentos requeridos" (línea ~269-277).

## Backend

Sin cambios. `GET /contracts/:id/document` (`gateway/src/contracts/contracts.controller.ts`) ya es de solo lectura, sin restricción de rol adicional, y ya lo consumen `flujo-mf` y `firmas-mf` de la misma forma.

## Testing

- Verificación manual E2E (no hay suite de tests de UI automatizados para estas vistas hoy): abrir el detalle de un contrato sin documento elaborado (antes de `ADMIN_REVIEW`) → ver el mensaje "aún no elaborado"; abrir el detalle de un contrato con documento ya guardado (después de que el Abogado lo elaboró) → ver el contenido real renderizado.
- Confirmar que el componente compartido no rompe el build de `commons` ni de los microfrontends que ya importan `DocumentPreview` (nombres/exports no colisionan).

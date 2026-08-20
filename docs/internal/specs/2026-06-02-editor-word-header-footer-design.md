# Editor de texto enriquecido tipo Word + Header/Footer en plantillas — Diseño

Fecha: 2026-06-02 · Estado: **implementado** (3 fases) — build + lint + verificación en vivo (Playwright) OK.

## 1. Contexto y motivación

El `RichTextEditor` actual (`contratos-mf/src/components/ui/rich-text-editor.tsx`) usa
`document.execCommand` (deprecado) sobre un `contenteditable`. Solo ofrece negrita, itálica,
H3 y listas, más toggle de código HTML y vista previa. Lo consumen **dos** features de
`contratos-mf` con la misma interfaz (`value` HTML / `onChange(html)`):

- `template-editor` → crear/editar **plantillas** de contrato (HU-18).
- `contract-editor` → **elaborar el documento** del contrato desde una plantilla (HU-19).

El editor WYSIWYG está marcado en `docs/00-overview/consideraciones-generales.md` como
diferenciador que "da más peso al proyecto". El Product Manager pidió:
1. Un editor mucho más completo, **tipo Word**, incluyendo **imágenes**.
2. Poder configurar **encabezado (header) y pie de página (footer)** en las plantillas.

**Nota de alcance:** header/footer, imágenes, tablas y PDF **no** están en las historias de
usuario (HU-18/HU-19 solo exigen WYSIWYG, asociar a sociedad, activar/desactivar, y cargar la
plantilla en el contrato). Este diseño **amplía el alcance** de forma deliberada, alineado con
el WYSIWYG como diferenciador del proyecto.

## 2. Objetivos

- Reemplazar el motor del editor por **TipTap (ProseMirror)** manteniendo HTML como
  formato de entrada/salida (compatible con el modelo `content` actual y con `content String`
  de Prisma a futuro).
- Set de funciones **tipo Word**: formato de texto, color, resaltado, alineación, listas,
  cita, código, regla, link, **imágenes**, **tablas**, salto de página, deshacer/rehacer,
  limpiar formato.
- **Imágenes** vía subida (base64 data URI) o URL.
- **Header/Footer + page setup** (tamaño A4/Carta + márgenes) por plantilla, visibles en
  vista previa e **impresión / Guardar PDF**.
- El **documento del contrato hereda** header/footer/page-setup de la plantilla aplicada
  (editables después).
- Construir el editor en **`@aletheia/frontend-commons`** para reúso por cualquier MF.

## 3. No-objetivos (YAGNI)

- Variables / merge-fields dinámicos (`{{cliente}}`, fechas) — **excepto** el token `{{page}}`
  para numeración de página en el footer al imprimir.
- Subida de imágenes a almacenamiento real (R2/S3). Por ahora **base64 en localStorage**.
- Paginación WYSIWYG real en pantalla (la "hoja" es visual; la paginación física ocurre solo
  al imprimir).
- Comentarios, control de cambios, colaboración en tiempo real.
- Tocar el backend (microservicios). Solo se **documenta** el cambio Prisma futuro.

## 4. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Motor | **TipTap (ProseMirror)** |
| Alcance funciones | **Completo tipo Word** (incl. imágenes + tablas + salto de página) |
| Header/Footer | **Por plantilla** + page setup (A4/Carta + márgenes), visible en preview/impresión |
| Imágenes | **base64 + URL** (mock; migrar a storage con backend) |
| Ubicación | **`@aletheia/frontend-commons`** desde ya |
| Entregable | **Las 3 fases** completas |

## 5. Arquitectura y componentes

Todo el código compartido vive en `apps/frontend/commons/src/ui/` y se exporta desde
`src/index.ts`. El tipo `PageSetup` se exporta también desde commons (los mocks de
`contratos-mf` lo importan).

### 5.1 `RichTextEditor` (commons, reescrito con TipTap)

Archivo nuevo: `commons/src/ui/rich-text-editor.tsx`. **Interfaz pública estable** (los
consumidores no cambian su forma de uso del cuerpo):

```ts
export interface RichTextEditorProps {
  value: string;                 // HTML
  onChange: (html: string) => void;
  ariaLabel?: string;
  /** Versión reducida (sin headings/tablas/salto de página) para header/footer. */
  compact?: boolean;
  /** Permite alternar a vista de código HTML. Default: true (false en compact). */
  allowHtmlSource?: boolean;
  className?: string;
}
```

- **Extensiones:** `@tiptap/starter-kit` (paragraph, bold, italic, strike, headings, bullet/
  ordered list, blockquote, code, code-block, horizontal-rule, **history/undo-redo**) +
  `underline`, `text-align`, `text-style` + `color`, `highlight`, `link`, `image`,
  `table` + `table-row` + `table-cell` + `table-header`, `placeholder`.
  En modo `compact` se cargan solo: bold, italic, underline, text-align, color, highlight,
  link, image (sin headings, listas avanzadas, tablas ni salto de página).
- **Salto de página:** TipTap no lo trae; se implementa como un **nodo custom mínimo**
  (`PageBreak`) que renderiza `<div class="page-break">` con `break-after: page` en
  `@media print`. En pantalla se muestra como una línea divisoria.
- **Toolbar Neobrutalism:** reusa `Button` y `cn` del design system + iconos `lucide-react`.
  Botones reflejan estado activo (`editor.isActive(...)`).
- **Imágenes:** botón "Imagen" → (a) subir archivo: `FileReader.readAsDataURL` → inserta
  `setImage({ src: dataUrl })`; (b) pegar URL. Validar `type.startsWith('image/')`.
- **SSR-safe (Next 15 + React 19):** `'use client'`, `useEditor({ immediatelyRender: false })`
  para evitar hydration mismatch.
- **Salida:** `onChange(editor.getHTML())`. Sincroniza contenido externo con
  `editor.commands.setContent(value)` solo cuando `value` difiere del HTML actual (evita
  pisar lo que escribe el usuario), mismo patrón que hoy.
- **Vista previa / código HTML:** se conservan los modos `edit | html | preview`. El preview
  usa el render saneado (ver 5.3).

### 5.2 `PageSetupControl` (commons)

Archivo nuevo: `commons/src/ui/page-setup.tsx`.

```ts
export interface PageSetup {
  size: 'A4' | 'LETTER';
  margins: { top: number; right: number; bottom: number; left: number }; // mm
}
export const DEFAULT_PAGE_SETUP: PageSetup; // A4, márgenes 25/25/25/25
```

UI: selector de tamaño (A4 / Carta) + 4 inputs numéricos de margen. `value: PageSetup`,
`onChange(next: PageSetup)`.

### 5.3 `DocumentPreview` (commons) — preview + impresión a PDF

Archivo nuevo: `commons/src/ui/document-preview.tsx`.

```ts
export interface DocumentPreviewProps {
  body: string;        // HTML del cuerpo
  header?: string;     // HTML
  footer?: string;     // HTML (admite token {{page}})
  pageSetup: PageSetup;
}
```

- Renderiza una "hoja": ancho = tamaño de página (A4 210mm / Carta 8.5in), `padding` =
  márgenes, con header arriba, body en medio, footer abajo, estilizado con la clase
  `prose-clm` ya existente.
- Botón **"Imprimir / Guardar PDF"** → `window.print()`.
- **Print CSS** (inyectado vía `<style media="print">` con id propio):
  - `@page { size: A4|letter; margin: <márgenes>mm }`.
  - Header/footer con `position: fixed; top/bottom` para **repetirse en cada hoja** impresa;
    el `<body>` de impresión recibe padding superior/inferior para no encimarse.
  - El token `{{page}}` del footer se reemplaza por un contador de páginas CSS
    (`counter(page)`); si el navegador no lo soporta, se documenta como limitación.
  - Se oculta el resto de la app en `@media print` (solo se imprime la hoja).
- **Sanitizado:** todo HTML (body/header/footer) pasa por **DOMPurify** antes de
  `dangerouslySetInnerHTML`. Reemplaza el `sanitizeHtml` por regex actual (insuficiente ahora
  que hay imágenes, links y tablas). Se permite `data:` URI en `img[src]` (allowlist puntual).

### 5.4 Exports de commons

`commons/src/index.ts` re-exporta: `RichTextEditor`, `RichTextEditorProps`,
`PageSetupControl`, `PageSetup`, `DEFAULT_PAGE_SETUP`, `DocumentPreview`, y el helper
`sanitizeDocumentHtml`.

## 6. Cambios en `contratos-mf`

- **Eliminar** `contratos-mf/src/components/ui/rich-text-editor.tsx`; importar
  `RichTextEditor` desde `@aletheia/frontend-commons`. (Su `textarea.tsx` local deja de ser
  usado por el editor; se conserva si lo usan otros.)
- **`template-editor`** (`TemplateEditorView.tsx`): añadir Card "Diseño de página" con
  `PageSetupControl` + dos `RichTextEditor compact` (Encabezado / Pie). Añadir pestaña/sección
  de **vista previa** con `DocumentPreview`. Persistir los nuevos campos.
- **`contract-editor`** (`ContractEditorView.tsx`): al aplicar plantilla, **heredar**
  `header`/`footer`/`pageSetup` al documento del contrato; permitir editarlos; añadir
  `DocumentPreview` + imprimir.

## 7. Modelo de datos (mock ahora; Prisma documentado)

### 7.1 `Template` (mock — `_mock/templates.ts`)

```ts
export interface Template {
  id: string;
  name: string;
  societyId: string | null;
  active: boolean;
  content: string;        // body HTML (sin cambios de nombre)
  header: string;         // NUEVO — HTML
  footer: string;         // NUEVO — HTML
  pageSetup: PageSetup;   // NUEVO
  createdAt: string;
  updatedAt: string;
}
```

- **Migración suave** en `readTemplates`: si un registro de localStorage no trae
  `header/footer/pageSetup`, se rellena con `''`/`''`/`DEFAULT_PAGE_SETUP`.
- Seeds (`SEED_TEMPLATES`) actualizados con header/footer de ejemplo (logo + nombre de
  sociedad arriba, "Página {{page}}" abajo) y `DEFAULT_PAGE_SETUP`.
- `useTemplates` (`create`/`update`) y `TemplateInput` aceptan los nuevos campos.

### 7.2 Documento del contrato (mock — `_mock/contracts.ts`)

Hoy se guarda como **string** (`read/writeContractDoc(contractId, html)`). Cambia a:

```ts
export interface ContractDoc {
  body: string;
  header: string;
  footer: string;
  pageSetup: PageSetup;
}
```

- `readContractDoc`: migración suave — si lo guardado es un string (formato viejo), se mapea a
  `{ body: <string>, header:'', footer:'', pageSetup: DEFAULT_PAGE_SETUP }`.
- Al aplicar plantilla en `contract-editor`, se copian `content→body`, `header`, `footer`,
  `pageSetup` de la plantilla al `ContractDoc`.

### 7.3 Prisma (solo documentación — `docs/01-architecture/base-datos.md`)

Documentar el cambio futuro (no se implementa backend):

```prisma
model Template {
  // ...campos actuales...
  header    String?  // HTML del encabezado
  footer    String?  // HTML del pie
  pageSetup Json?    // { size, margins }
}
```

## 8. Dependencias nuevas

En `apps/frontend/commons/package.json`:

- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`
- `@tiptap/extension-underline`, `-text-align`, `-text-style`, `-color`, `-highlight`,
  `-link`, `-image`
- `@tiptap/extension-table`, `-table-row`, `-table-cell`, `-table-header`
- `@tiptap/extension-placeholder`
- `dompurify` (+ `@types/dompurify` en devDeps)

Todas compatibles con React 19 (TipTap v2.10+/v3). `react`/`react-dom` siguen como
peerDependencies de commons.

## 9. Riesgos y mitigaciones

- **SSR/hydration (Next 15):** `immediatelyRender: false` en `useEditor`. El componente ya es
  `'use client'`.
- **Impresión con header/footer repetido:** `position: fixed` en `@media print` repite el
  bloque en cada hoja en Chrome (que es como se guardará el PDF). En otros navegadores el
  comportamiento varía; aceptable para alcance académico. Se documenta.
- **Numeración `{{page}}`:** depende de `counter(page)` en CSS de impresión; si falla, queda
  como limitación conocida (no bloquea el resto).
- **localStorage / base64:** las imágenes inflan el almacenamiento (quota ~5 MB). El `catch`
  de `writeTemplates` ya ignora errores de quota; se añade aviso en UI si el guardado falla.
- **Bundle:** TipTap + extensiones agregan peso; aceptable (es app interna). Solo se cargan en
  el cliente.

## 10. Fases de implementación

1. **Editor TipTap (drop-in) en commons** — `RichTextEditor` con todas las funciones de
   cuerpo + imágenes + tablas + `sanitizeDocumentHtml`. Ambos editores de `contratos-mf`
   importan de commons. Verifica que no se rompe el guardado HTML actual.
2. **Page setup + header/footer + preview/print** — `PageSetupControl`, `DocumentPreview`,
   modelo `Template` extendido, UI en `template-editor`, impresión a PDF.
3. **Herencia en el contrato** — `ContractDoc` extendido, herencia al aplicar plantilla,
   preview/print en `contract-editor`.

## 11. Verificación

- Compilar (CLAUDE.md): `pnpm --filter @aletheia/frontend-commons lint` y
  `pnpm --filter contratos-mf build` (y `pnpm build` global antes de cerrar).
- E2E manual (o skill `levsek-e2e` / Playwright): crear plantilla con header/footer + imagen +
  tabla → preview → imprimir/PDF; elaborar contrato heredando el diseño; recargar y verificar
  persistencia + migración suave de registros viejos en localStorage.

## 12. Preguntas abiertas

Ninguna. (Variables/merge-fields quedan fuera por YAGNI; `{{page}}` es la única excepción.)

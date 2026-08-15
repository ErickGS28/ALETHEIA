# Almacenamiento real de documentos en Cloudflare R2 — Diseño

Fecha: 2026-08-14 · Estado: **diseño aprobado**, pendiente de plan de implementación.

## 1. Contexto y motivación

Hoy los "documentos de soporte" que sube el Solicitante (`documentos-mf`) no suben contenido real:
`DocumentUploadView.handleUpload()` fabrica un `fileUrl` falso (`uploads/<nombre-de-archivo>`) a
partir del nombre del archivo y manda JSON, nunca el archivo en sí. El backend (gateway) ya está
listo para recibir multipart real (`FileInterceptor('file')` en `POST /documents/:contractId` y
`.../versions`, con Prisma `DocumentVersion.fileUrl/fileSize/mimeType` ya en el esquema) — el gap
está 100% en el frontend.

Además, el storage que sí existe (`FileStorageService`, disco local en
`apps/backend/gateway/storage/uploads`, servido vía `GET /files/:id`) se usa también para el
documento formal del contrato (JSON de header/body/footer que elabora el Abogado, guardado con
`saveText`/`readText` bajo una key determinística). El proyecto se va a desplegar en Dockploy
(contenedores) — **el disco local no persiste entre redeploys**, así que ambos flujos (documentos
de soporte y el documento formal) perderían sus archivos en cada redeploy si no se resuelve esto.

El usuario ya tiene un patrón probado de subida a Cloudflare R2 en otro proyecto
(`C:\ERICK\Levsek\Proyectos\conectate`, `CloudflareService`/`CloudflareConfigModule`) usando
`@aws-sdk/client-s3`, que sirve de referencia para esta implementación.

## 2. Objetivos

- Reemplazar el storage físico (disco local) por Cloudflare R2 para **ambos** flujos: documentos
  de soporte reales y el documento formal del contrato.
- El frontend de `documentos-mf` debe subir el archivo real (bytes), no solo su nombre.
- Poder visualizar el contenido de un documento de soporte ya subido, en un modal — mismo patrón
  visual que ya existe para el documento formal (`Modal` + preview), pero con un visor distinto
  porque el contenido es un archivo real (PDF/imagen), no HTML estructurado.
- Mantener exactamente el mismo modelo de seguridad que existe hoy: los archivos solo son
  accesibles a usuarios autenticados (`JwtAuthGuard`), nunca vía URL pública sin sesión.
- Que desarrollo local siga funcionando sin credenciales de R2 reales (fallback a disco).

## 3. No-objetivos (YAGNI)

- No se migran documentos ya subidos con el esquema viejo — no hay datos reales de producción
  todavía, solo flujo de desarrollo/QA.
- No se agrega un endpoint de borrado de documentos (no existe hoy) — solo se deja `delete(key)`
  listo en la interfaz de storage para cuando se necesite.
- No se expone la URL pública de R2 (`CLOUDFLARE_R2_PUBLIC_URL`) al frontend — todo se sirve vía
  proxy autenticado del gateway, así que esa env var ni se requiere.
- No se toca `DocumentPreview` (el renderer de HTML del documento formal) — sigue siendo exclusivo
  para ese caso; el nuevo visor de archivos es un componente distinto.
- No se agrega redimensionado de imágenes tipo `sharp` (presente en `conectate` para fotos de
  producto) — los documentos de soporte son PDFs/comprobantes, no se benefician de eso.

## 4. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Alcance de R2 | Documentos de soporte **y** documento formal del contrato (ambos usan el mismo storage físico hoy, ambos se perderían en Dockploy si no se migran) |
| Exposición de archivos | Proxy autenticado por el gateway (`GET /files/:id`, mismo `JwtAuthGuard` de hoy) — nunca la URL pública de R2 directo al navegador |
| R2 en desarrollo local | Opcional — si faltan las env vars de R2, cae a disco local (mismo patrón "soft dependency" de `conectate`) |
| Validación de archivos | Se agrega en el backend (tamaño 10MB, mime PDF/PNG/JPG) — hoy solo existe en el frontend, que se puede saltar |
| Limpieza en R2 | `delete(key)` disponible en la interfaz de storage, sin endpoint nuevo (no hay borrado de documentos hoy) |
| Dónde previsualizar | Solo en `documentos-mf`, donde ya se listan los documentos subidos — no en el detalle general del contrato |
| SDK | `@aws-sdk/client-s3` (mismo que `conectate`), sin presigner — subida/lectura server-side con buffers/streams |

## 5. Diseño detallado

### 5.1 Interfaz de storage (`apps/backend/gateway/src/documents/storage/`)

Nueva interfaz `StorageService`, dos implementaciones intercambiables detrás de un token DI:

```ts
interface StorageService {
  save(file: Express.Multer.File): Promise<{ fileUrl: string; fileSize: number; mimeType: string }>;
  getStream(id: string): Promise<{ stream: NodeJS.ReadableStream; contentType?: string } | null>;
  saveText(key: string, content: string): Promise<void>;
  readText(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}
```

- `DiskStorageService` — la implementación actual (`FileStorageService`), adaptada a la interfaz
  (renombra `resolvePath`+`createReadStream` a `getStream`, agrega `delete`). Lógica interna sin
  cambios.
- `R2StorageService` — nueva, usando `S3Client({ endpoint, region: 'auto', credentials })`:
  - `save()`: valida tamaño/mime, genera key plana sin `/` (`aletheia-doc-<uuid><ext>` — importante
    que no tenga barras, para que quepa como un solo segmento de `/files/:id`), `PutObjectCommand`,
    devuelve `fileUrl: /files/<key>` (mismo formato que hoy, cero cambios en quien ya consume
    `fileUrl`).
  - `getStream()`: `GetObjectCommand`, devuelve `Body` como stream + `ContentType`.
  - `saveText()`/`readText()`: mismo mecanismo, key con prefijo distinto
    (`aletheia-contract-doc-<contractId>.json`), nunca pasa por `/files/:id` — se lee server-side
    directo por key desde `ContractsController`/`WorkflowController`.
  - `delete()`: `DeleteObjectCommand`.
- Provider factory: si `CLOUDFLARE_R2_ACCESS_KEY`/`SECRET_KEY`/`BUCKET_NAME`/`ENDPOINT` están
  presentes (vía `ConfigService`), inyecta `R2StorageService`; si no, `DiskStorageService`. Los 4
  controladores (`DocumentsController`, `FilesController`, `ContractsController`,
  `WorkflowController`) inyectan el token `StorageService`, no la clase concreta.

### 5.2 Backend — flujo de subida y servido

- `POST /documents/:contractId` y `.../versions`: sin cambios de firma. `resolveFileMeta()` llama
  `storage.save(file)`; si falla validación (tamaño/mime), `400`.
- `GET /files/:id`: sigue detrás de `JwtAuthGuard`. `FilesController.download()` usa
  `storage.getStream(id)` en vez de `resolvePath`+`createReadStream` — el resto (Content-Type por
  extensión/`ContentType` de R2, `INLINE_SAFE_TYPES`, headers CSP/nosniff) no cambia.
- `ContractsController`/`WorkflowController`: cambian `this.storage.readText/saveText` para usar la
  interfaz — comportamiento idéntico, solo cambia qué hay detrás.

### 5.3 Frontend — `documentos-mf`

- `documentsApi.ts`: `uploadDocument`/`addVersion` pasan a aceptar un `File` y construir `FormData`
  (campo `file`) en vez de JSON. `fetchBaseQuery` (RTK Query) detecta `FormData` automáticamente,
  no hace falta tocar `baseApi`.
- `DocumentUploadView.handleUpload()`: deja de fabricar `fileUrl` falso, pasa el `File` real.
- Nuevo `FileViewerModal` en `apps/frontend/commons/src/ui/` — envuelve `Modal`: PDF → `<iframe>`,
  imagen (`image/png|jpeg`) → `<img>`, cualquier otro tipo → enlace de descarga. Mismo criterio que
  `INLINE_SAFE_TYPES` del backend.
- `DocumentUploadRow.tsx`: agrega botón "Ver" junto a los metadatos ya mostrados (línea ~116-129)
  que abre `FileViewerModal` con la `fileUrl` de la versión activa.

### 5.4 Config

Nuevas env vars en `apps/backend/gateway/.env.example`, leídas vía `ConfigService` (no
`process.env` directo, seams con `clients.module.ts`/`auth.module.ts`):
`CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`,
`CLOUDFLARE_R2_ENDPOINT`. No se incluye `CLOUDFLARE_R2_PUBLIC_URL` (no se usa con proxy
autenticado).

## 6. Manejo de errores

- Validación fallida (tamaño/mime) en `save()`: `400 BadRequestException`, mismo mensaje que ya
  usa `resolveFileMeta` para el caso "sin archivo ni fileUrl".
- R2 no configurado y sin fallback aplicable (no debería pasar, ya que el factory cae a disco):
  documentado como caso imposible por diseño del provider.
- `GET /files/:id` sobre una key que no existe en R2: `404 NotFoundException`, igual que hoy con
  disco.
- Fallos de red hacia R2 en `save()`/`getStream()`: se dejan propagar como error 5xx — no hay
  reintento automático (fuera de alcance, igual que el resto del backend no tiene retry logic).

## 7. Testing / verificación

- Backend: unit tests para `R2StorageService` (mock de `S3Client.send`) y para la validación de
  tamaño/mime en `resolveFileMeta`.
- No hay framework de test en los microfrontends (confirmado en sesiones previas) — verificación
  manual: subir PDF e imagen como Solicitante, confirmar el objeto en el bucket R2, confirmar que
  "Ver" los muestra correctamente logueado, y que `GET /files/:id` sin cookie/JWT es rechazado.
- Verificar en dev local que, sin env vars de R2, el flujo sigue funcionando contra disco (fallback).

# Almacenamiento de documentos en Cloudflare R2 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local-disk file storage in the gateway with Cloudflare R2 (S3-compatible), for both real support-document uploads (`documentos-mf`) and the elaborated contract-document text blob, so files survive Dockploy container redeploys and support-documents can actually be viewed instead of only recording a fake filename.

**Architecture:** A `StorageService` interface behind a DI token (`STORAGE_SERVICE`) with two implementations — `DiskStorageService` (today's behavior, unchanged) and `R2StorageService` (new, `@aws-sdk/client-s3`). A factory provider in `StorageModule` picks R2 when its 4 env vars are all present, otherwise falls back to disk — so local dev needs no real credentials. Files stay served through the gateway's existing `GET /files/:id` (behind `JwtAuthGuard`) — the R2 bucket's public URL is never exposed to the browser. The frontend gains a `FileViewerModal` (in `@aletheia/frontend-commons`) that fetches the file as an authenticated blob (the gateway only accepts a Bearer header, which `<img>`/`<iframe src>` cannot send) and renders it inline or as a download link.

**Tech Stack:** NestJS 11 (gateway), `@aws-sdk/client-s3` ^3.800.0, `@nestjs/config` ConfigService, RTK Query (`fetchBaseQuery`, native `FormData` support), Next.js/React (documentos-mf, `@aletheia/frontend-commons`).

## Global Constraints

- No test framework exists anywhere in `apps/backend` (confirmed: no `jest` in any `package.json`) or in the frontend microfrontends. Do **not** introduce Jest/testing-library for this feature — that would be an unrequested scope expansion. Verification is: TypeScript compiles clean (`pnpm --filter <pkg> build`) at the end of every task, plus a manual runtime check on tasks that change behavior (documented per-task below).
- Biome (`biome check`) runs as a pre-commit hook (`.husky/pre-commit`) and auto-fixes formatting — expect it to reformat on commit; re-stage if it modifies files after `git add`.
- Object keys used in `/files/:id` must never contain `/` — Express treats `:id` as a single path segment, and a literal slash would 404 or split the route. Keep all such keys flat (`<prefix>-<uuid><ext>`).
- Never construct `R2StorageService` unconditionally as an eager Nest DI provider — its constructor requires all 4 R2 env vars. It must only be instantiated inside the `StorageModule` factory function, after confirming the vars are present, so local dev without R2 credentials doesn't crash on boot.
- `CLOUDFLARE_R2_PUBLIC_URL` is intentionally never read or required — the proxy design doesn't use it.

---

### Task 1: Storage interface + Disk implementation

**Files:**
- Create: `apps/backend/gateway/src/documents/storage/storage.interface.ts`
- Create: `apps/backend/gateway/src/documents/storage/file-name.util.ts`
- Create: `apps/backend/gateway/src/documents/storage/disk-storage.service.ts`

**Interfaces:**
- Produces: `StorageService` interface and `STORAGE_SERVICE` DI token (used by every later task), `safeExtension(originalName: string): string` util, `DiskStorageService` class implementing `StorageService`.

This task is purely additive — nothing references these new files yet, so the existing app keeps building and running exactly as before.

- [ ] **Step 1: Create the storage interface and DI token**

`apps/backend/gateway/src/documents/storage/storage.interface.ts`:

```ts
/** DI token for the active StorageService implementation (Disk or R2). */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/**
 * Storage abstraction for document binaries and small text blobs (the
 * elaborated contract document JSON). Two implementations exist —
 * DiskStorageService (local dev fallback) and R2StorageService (production,
 * Cloudflare R2) — selected by StorageModule's factory provider.
 */
export interface StorageService {
  /** Persists an uploaded file and returns metadata, including a servable "/files/<id>" URL. */
  save(
    file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileSize: number; mimeType: string }>;

  /** Opens a read stream for a stored file by its id (the segment after "/files/"). Null if missing. */
  getStream(id: string): Promise<NodeJS.ReadableStream | null>;

  /** Persists a UTF-8 text payload under a deterministic key, overwriting any previous content. */
  saveText(key: string, content: string): Promise<{ fileUrl: string }>;

  /** Reads back a text payload saved with saveText. Null if never saved. */
  readText(key: string): Promise<string | null>;

  /** Deletes a stored file/text blob by its id/key. No-op if it doesn't exist. */
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 2: Create the shared extension-sanitizing util**

`apps/backend/gateway/src/documents/storage/file-name.util.ts`:

```ts
import { extname } from 'node:path';

/**
 * Extracts a conservative, safe extension from an original filename
 * (defense against path/extension injection in generated storage keys).
 * Returns '' when the extension doesn't match a plain alphanumeric pattern.
 */
export function safeExtension(originalName: string): string {
  const ext = extname(originalName || '').toLowerCase();
  return /^\.[a-z0-9]{1,12}$/.test(ext) ? ext : '';
}
```

- [ ] **Step 3: Create `DiskStorageService` implementing `StorageService`**

`apps/backend/gateway/src/documents/storage/disk-storage.service.ts` (adapted from the current
`file-storage.service.ts` — same on-disk behavior, `resolvePath`/`createReadStream` collapsed into
`getStream`, `delete` added, `resolvePath`/`safeKey` become private):

```ts
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { safeExtension } from './file-name.util';
import type { StorageService } from './storage.interface';

/**
 * Local disk file storage — the dev fallback when Cloudflare R2 isn't
 * configured. Uploads dir is configurable via FILE_STORAGE_DIR.
 * Default: <gateway-cwd>/storage/uploads.
 */
@Injectable()
export class DiskStorageService implements StorageService {
  readonly uploadsDir: string =
    process.env.FILE_STORAGE_DIR ?? resolve(process.cwd(), 'storage', 'uploads');

  async save(
    file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileSize: number; mimeType: string }> {
    await mkdir(this.uploadsDir, { recursive: true });
    const storedFileName = `${randomUUID()}${safeExtension(file.originalname)}`;
    await writeFile(join(this.uploadsDir, storedFileName), file.buffer);
    return {
      fileUrl: `/files/${storedFileName}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
    };
  }

  async getStream(id: string): Promise<NodeJS.ReadableStream | null> {
    const absolutePath = this.resolvePath(id);
    if (!absolutePath) return null;
    return createReadStream(absolutePath);
  }

  async saveText(key: string, content: string): Promise<{ fileUrl: string }> {
    await mkdir(this.uploadsDir, { recursive: true });
    const storedFileName = this.safeKey(key);
    await writeFile(join(this.uploadsDir, storedFileName), content, 'utf8');
    return { fileUrl: `/files/${storedFileName}` };
  }

  async readText(key: string): Promise<string | null> {
    const absolutePath = this.resolvePath(this.safeKey(key));
    if (!absolutePath) return null;
    return readFile(absolutePath, 'utf8');
  }

  async delete(id: string): Promise<void> {
    const absolutePath = this.resolvePath(id);
    if (!absolutePath) return;
    await unlink(absolutePath);
  }

  /** Resolves a stored file name to an absolute path, guarding against path traversal. */
  private resolvePath(storedFileName: string): string | null {
    const base = normalize(storedFileName).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = join(this.uploadsDir, base);
    if (!absolutePath.startsWith(this.uploadsDir)) return null;
    if (!existsSync(absolutePath)) return null;
    return absolutePath;
  }

  private safeKey(key: string): string {
    return key.replace(/[^a-z0-9._-]/gi, '_');
  }
}
```

- [ ] **Step 4: Verify the gateway still compiles**

Run: `pnpm --filter @aletheia/gateway build`
Expected: succeeds with no errors (the old `file-storage.service.ts` still exists and is still what
every controller uses — this task added new, unreferenced files only).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/gateway/src/documents/storage/storage.interface.ts apps/backend/gateway/src/documents/storage/file-name.util.ts apps/backend/gateway/src/documents/storage/disk-storage.service.ts
git commit -m "feat(gateway): add StorageService interface and DiskStorageService"
```

---

### Task 2: R2 implementation + upload validation

**Files:**
- Modify: `apps/backend/gateway/package.json`
- Create: `apps/backend/gateway/src/documents/storage/r2-storage.service.ts`
- Create: `apps/backend/gateway/src/documents/storage/file-validation.ts`

**Interfaces:**
- Consumes: `StorageService` (Task 1), `safeExtension` (Task 1).
- Produces: `R2StorageService` class (constructed with a plain config object, **not** DI-injected
  directly — see Task 3), `assertValidUpload(file: Express.Multer.File): void`.

Also additive — still nothing wired to a controller yet.

- [ ] **Step 1: Add the AWS SDK S3 client dependency**

In `apps/backend/gateway/package.json`, add to `"dependencies"`:

```json
"@aws-sdk/client-s3": "^3.800.0",
```

Run: `pnpm install`
Expected: lockfile updates, no errors.

- [ ] **Step 2: Create the upload validator**

`apps/backend/gateway/src/documents/storage/file-validation.ts` (mirrors
`apps/frontend/microfrontends/documentos-mf/src/lib/fileValidation.ts` — defense in depth, since
the client-side check can be bypassed):

```ts
import { BadRequestException } from '@nestjs/common';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);

/** Server-side upload validation — mirrors the frontend's validateDocumentFile. */
export function assertValidUpload(file: Express.Multer.File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException('El archivo supera el máximo de 10MB.');
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Formato no permitido. Usa PDF, PNG o JPG.');
  }
}
```

- [ ] **Step 3: Create `R2StorageService`**

`apps/backend/gateway/src/documents/storage/r2-storage.service.ts`:

```ts
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { safeExtension } from './file-name.util';
import type { StorageService } from './storage.interface';

export interface R2Config {
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
}

/**
 * Cloudflare R2 (S3-compatible) storage. Object keys stay flat (no "/") so
 * they always fit as a single /files/:id route segment. Text keys (the
 * elaborated contract-document JSON) get an "aletheia-" prefix so they don't
 * collide with other projects that may share the same bucket.
 *
 * Deliberately NOT a Nest DI provider — its constructor requires a fully
 * resolved config, so StorageModule's factory constructs it manually only
 * after confirming all 4 R2 env vars are present (see Task 3). This is what
 * lets local dev fall back to DiskStorageService without R2 credentials.
 */
export class R2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: 'auto',
      credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    });
  }

  async save(
    file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileSize: number; mimeType: string }> {
    const key = `aletheia-doc-${randomUUID()}${safeExtension(file.originalname)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      }),
    );
    return {
      fileUrl: `/files/${key}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
    };
  }

  async getStream(id: string): Promise<NodeJS.ReadableStream | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: id }),
      );
      return result.Body as NodeJS.ReadableStream;
    } catch (err) {
      if (err instanceof Error && err.name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async saveText(key: string, content: string): Promise<{ fileUrl: string }> {
    const objectKey = `aletheia-${key}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: content,
        ContentType: 'application/json; charset=utf-8',
      }),
    );
    return { fileUrl: `/files/${objectKey}` };
  }

  async readText(key: string): Promise<string | null> {
    const objectKey = `aletheia-${key}`;
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return (await result.Body?.transformToString()) ?? null;
    } catch (err) {
      if (err instanceof Error && err.name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: id }));
  }
}
```

- [ ] **Step 4: Verify the gateway still compiles**

Run: `pnpm --filter @aletheia/gateway build`
Expected: succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/gateway/package.json pnpm-lock.yaml apps/backend/gateway/src/documents/storage/r2-storage.service.ts apps/backend/gateway/src/documents/storage/file-validation.ts
git commit -m "feat(gateway): add R2StorageService and server-side upload validation"
```

---

### Task 3: Wire StorageModule into the gateway, retire disk-only storage

**Files:**
- Create: `apps/backend/gateway/src/documents/storage/storage.module.ts`
- Delete: `apps/backend/gateway/src/documents/storage/file-storage.service.ts`
- Modify: `apps/backend/gateway/src/documents/documents.module.ts`
- Modify: `apps/backend/gateway/src/documents/documents.controller.ts`
- Modify: `apps/backend/gateway/src/documents/files.controller.ts`
- Modify: `apps/backend/gateway/src/documents/dto/document.dto.ts`
- Modify: `apps/backend/gateway/src/contracts/contracts.module.ts`
- Modify: `apps/backend/gateway/src/contracts/contracts.controller.ts`
- Modify: `apps/backend/gateway/src/workflow/workflow.module.ts`
- Modify: `apps/backend/gateway/src/workflow/workflow.controller.ts`
- Modify: `apps/backend/gateway/.env.example`

**Interfaces:**
- Consumes: `StorageService`/`STORAGE_SERVICE` (Task 1), `DiskStorageService` (Task 1),
  `R2StorageService`/`R2Config` (Task 2), `assertValidUpload` (Task 2).

This is the "flip the switch" task — after it, the app runs entirely against the new abstraction
and the old disk-only service is gone.

- [ ] **Step 1: Create `StorageModule` with the Disk/R2 factory provider**

`apps/backend/gateway/src/documents/storage/storage.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiskStorageService } from './disk-storage.service';
import { R2StorageService } from './r2-storage.service';
import { STORAGE_SERVICE, type StorageService } from './storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    DiskStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, disk: DiskStorageService): StorageService => {
        const accessKey = config.get<string>('CLOUDFLARE_R2_ACCESS_KEY');
        const secretKey = config.get<string>('CLOUDFLARE_R2_SECRET_KEY');
        const bucket = config.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
        const endpoint = config.get<string>('CLOUDFLARE_R2_ENDPOINT');
        if (accessKey && secretKey && bucket && endpoint) {
          return new R2StorageService({ accessKey, secretKey, bucket, endpoint });
        }
        return disk;
      },
      inject: [ConfigService, DiskStorageService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
```

- [ ] **Step 2: Point `DocumentsModule` at `StorageModule`**

`apps/backend/gateway/src/documents/documents.module.ts` — replace entirely:

```ts
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { FilesController } from './files.controller';
import { SignaturesController } from './signatures.controller';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DocumentsController, FilesController, SignaturesController],
})
export class DocumentsModule {}
```

- [ ] **Step 3: Update `documents.controller.ts` to use `StorageService` + validate uploads**

In `apps/backend/gateway/src/documents/documents.controller.ts`:
- Replace `import { FileStorageService } from './storage/file-storage.service';` with:
  ```ts
  import { assertValidUpload } from './storage/file-validation';
  import { STORAGE_SERVICE, type StorageService } from './storage/storage.interface';
  ```
- Replace the constructor (the class already imports `Inject` from `@nestjs/common` for the
  `ClientProxy` param, so only the second param's type/decorator changes):
  ```ts
  constructor(
    @Inject(SERVICE_CLIENTS.DOCUMENTS) private readonly documents: ClientProxy,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}
  ```
- In `resolveFileMeta`, call `assertValidUpload(file)` before `this.storage.save(file)`:
  ```ts
  private async resolveFileMeta(
    file: Express.Multer.File | undefined,
    body: { fileUrl?: string },
  ): Promise<{ fileUrl: string; fileSize?: number; mimeType?: string } | Record<string, never>> {
    if (file) {
      assertValidUpload(file);
      const { fileUrl, fileSize, mimeType } = await this.storage.save(file);
      return { fileUrl, fileSize, mimeType };
    }
    if (!body.fileUrl) {
      throw new BadRequestException('Debe subir un archivo (campo "file") o enviar "fileUrl".');
    }
    return {};
  }
  ```

- [ ] **Step 4: Fix `isRequired` to accept multipart's stringified booleans**

In `apps/backend/gateway/src/documents/dto/document.dto.ts`, add the `Transform` import and
decorator on `CreateDocumentDto.isRequired` (multipart form fields arrive as strings; JSON callers
still send real booleans):

```ts
import { Transform } from 'class-transformer';
```

```ts
@ApiPropertyOptional({ example: true })
@IsOptional()
@Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
@IsBoolean()
isRequired?: boolean;
```

- [ ] **Step 5: Update `files.controller.ts` to stream via `StorageService`**

In `apps/backend/gateway/src/documents/files.controller.ts`:
- Replace `import { FileStorageService } from './storage/file-storage.service';` with
  `import { STORAGE_SERVICE, type StorageService } from './storage/storage.interface';`.
- Replace `import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';` with
  `import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';`.
- Replace the constructor and `download` method:
  ```ts
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Descargar/servir un archivo almacenado' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const stream = await this.storage.getStream(id);
    if (!stream) throw new NotFoundException('Archivo no encontrado');

    const contentType = MIME_BY_EXT[extname(id).toLowerCase()] ?? 'application/octet-stream';
    const disposition = INLINE_SAFE_TYPES.has(contentType) ? 'inline' : 'attachment';
    const safeName = basename(id).replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);

    stream.pipe(res);
  }
  ```
  (`INLINE_SAFE_TYPES`/`MIME_BY_EXT` constants and the `basename`/`extname` import stay unchanged.)

- [ ] **Step 6: Point `ContractsModule`/`WorkflowModule` at `StorageModule`**

`apps/backend/gateway/src/contracts/contracts.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { StorageModule } from '../documents/storage/storage.module';
import { ContractsController } from './contracts.controller';

@Module({
  imports: [StorageModule],
  controllers: [ContractsController],
})
export class ContractsModule {}
```

`apps/backend/gateway/src/workflow/workflow.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { StorageModule } from '../documents/storage/storage.module';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [StorageModule],
  controllers: [WorkflowController],
})
export class WorkflowModule {}
```

- [ ] **Step 7: Update `contracts.controller.ts` and `workflow.controller.ts` imports**

In both `apps/backend/gateway/src/contracts/contracts.controller.ts` and
`apps/backend/gateway/src/workflow/workflow.controller.ts`:
- Replace `import { FileStorageService } from '../documents/storage/file-storage.service';` with
  `import { STORAGE_SERVICE, type StorageService } from '../documents/storage/storage.interface';`.
- Both files already import `Inject` from `@nestjs/common` for their `ClientProxy` params.

`contracts.controller.ts`'s constructor becomes:
```ts
constructor(
    @Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy,
    @Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}
```

`workflow.controller.ts`'s constructor becomes:
```ts
constructor(
    @Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}
```

No other line in either controller changes — `readText`/`saveText` calls keep their existing
signatures.

- [ ] **Step 8: Delete the old disk-only service**

```bash
rm apps/backend/gateway/src/documents/storage/file-storage.service.ts
```

- [ ] **Step 9: Add the R2 env vars to `.env.example`**

Append to `apps/backend/gateway/.env.example`:

```
# Cloudflare R2 (almacenamiento de documentos). Si se omiten, cae a disco local
# (apps/backend/gateway/storage/uploads) — útil para desarrollo sin credenciales reales.
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_ENDPOINT=
```

- [ ] **Step 10: Verify the gateway compiles and starts against disk fallback**

Run: `pnpm --filter @aletheia/gateway build`
Expected: succeeds with no errors, no remaining references to `FileStorageService` anywhere
(`grep -r "FileStorageService" apps/backend/gateway/src` returns nothing).

Since no R2 env vars are set locally, `StorageModule`'s factory falls back to `DiskStorageService`
— manually confirm with the dev stack running (`pnpm dev:staged` or `pnpm dev:be`):
1. `POST /documents/:contractId` with a multipart file (e.g. via the Swagger UI at the gateway's
   `/api` docs) succeeds and returns a `fileUrl` like `/files/<uuid>.pdf`.
2. `GET /files/<uuid>.pdf` with a valid `Authorization: Bearer` header streams the file back.
3. `GET /files/<uuid>.pdf` with no `Authorization` header returns `401`.
4. Uploading an 11MB file or a `.exe` returns `400` with the validation message.

- [ ] **Step 11: Commit**

```bash
git add apps/backend/gateway/src apps/backend/gateway/.env.example
git commit -m "feat(gateway): wire StorageService (R2/disk) into documents, files, contracts, and workflow controllers"
```

---

### Task 4: Frontend — upload real file bytes

**Files:**
- Modify: `apps/frontend/microfrontends/documentos-mf/src/api/documentsApi.ts`
- Modify: `apps/frontend/microfrontends/documentos-mf/src/features/document-upload/components/DocumentUploadView.tsx`

**Interfaces:**
- Consumes: `POST /documents/:contractId` and `POST /documents/:id/versions` (Task 3, now accept
  real multipart with server-side validation).
- Produces: `UploadDocumentArgs`/`AddVersionArgs` now require a `file: File` field (breaking change
  to these two mutation hooks' argument shape — both call sites are updated in this same task).

- [ ] **Step 1: Change `uploadDocument`/`addVersion` to send `FormData`**

In `apps/frontend/microfrontends/documentos-mf/src/api/documentsApi.ts`, replace the two interfaces
and their mutations:

```ts
interface UploadDocumentArgs {
  contractId: number;
  file: File;
  body: {
    name: string;
    type: string;
    isRequired?: boolean;
    expiresAt?: string;
  };
}

interface AddVersionArgs {
  documentId: number;
  file: File;
}
```

```ts
    // POST /documents/:contractId — create a document (its first version)
    uploadDocument: b.mutation<ApiDocument, UploadDocumentArgs>({
      query: ({ contractId, file, body }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', body.name);
        formData.append('type', body.type);
        if (body.isRequired !== undefined) formData.append('isRequired', String(body.isRequired));
        if (body.expiresAt) formData.append('expiresAt', body.expiresAt);
        return { url: `/documents/${contractId}`, method: 'POST', body: formData };
      },
      invalidatesTags: ['Document'],
    }),
    // POST /documents/:id/versions — add a new version, bumps currentVersion
    addVersion: b.mutation<ApiDocument, AddVersionArgs>({
      query: ({ documentId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: `/documents/${documentId}/versions`, method: 'POST', body: formData };
      },
      invalidatesTags: ['Document'],
    }),
```

(`fetchBaseQuery` detects a `FormData` body automatically — it skips JSON-stringifying it and lets
the browser set the multipart `Content-Type`/boundary, so `baseApi` needs no changes.)

- [ ] **Step 2: Stop fabricating `fileUrl`, pass the real file**

In `apps/frontend/microfrontends/documentos-mf/src/features/document-upload/components/DocumentUploadView.tsx`,
replace `handleUpload`'s body (drop the `fileUrl: /uploads/...` fabrication, `fileSize`/`mimeType`
— the backend now derives all three from the uploaded file):

```ts
  async function handleUpload(
    type: string,
    file: File,
    expiryDate?: string,
    isRequired = true,
  ): Promise<boolean> {
    if (contractId === '') return false;
    try {
      await uploadDocument({
        contractId,
        file,
        body: {
          name: file.name,
          type,
          isRequired,
          expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        },
      }).unwrap();
      toast.success('Documento cargado', `"${file.name}" se cargó correctamente.`);
      return true;
    } catch (error) {
      toast.error(
        'No se pudo cargar',
        getApiErrorMessage(error, 'No se pudo cargar el documento.'),
      );
      return false;
    }
  }
```

Remove the now-unused `fileNameFromUrl` import from this file (it stays used in `lib/adapter.ts`,
untouched here).

- [ ] **Step 3: Verify documentos-mf compiles**

Run: `pnpm --filter documentos-mf build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual verification against the running dev stack**

With the backend from Task 3 and frontend running (`pnpm dev:staged`), log in as Solicitante, go to
**Documentos**, upload a real PDF for a required document slot. Confirm: the upload succeeds, the
row switches to "Cargado" with the real file size/mime shown, and (per Task 3's manual check) the
object now exists in the gateway's storage backend.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/microfrontends/documentos-mf/src/api/documentsApi.ts apps/frontend/microfrontends/documentos-mf/src/features/document-upload/components/DocumentUploadView.tsx
git commit -m "feat(documentos-mf): upload real file bytes instead of a fabricated fileUrl"
```

---

### Task 5: `FileViewerModal` component (commons)

**Files:**
- Create: `apps/frontend/commons/src/ui/file-viewer-modal.tsx`
- Modify: `apps/frontend/commons/src/index.ts`

**Interfaces:**
- Consumes: `Modal` (`apps/frontend/commons/src/ui/modal.tsx`), `Button`
  (`apps/frontend/commons/src/ui/button.tsx`), `API_URL` and `getAccessToken` (both already
  exported from `@aletheia/frontend-commons` via `./api/base-api` and `./api/session`).
- Produces: `FileViewerModal` component, exported from `@aletheia/frontend-commons`, consumed by
  Task 6.

The gateway's `GET /files/:id` only accepts the token via an `Authorization: Bearer` header (see
`apps/backend/commons/src/security/strategies/jwt.strategy.ts`,
`ExtractJwt.fromAuthHeaderAsBearerToken()`) — a plain `<img src>`/`<iframe src>` cannot send custom
headers, so this component fetches the file as an authenticated `Blob` and renders it via a local
`URL.createObjectURL`, revoking it on close/unmount to avoid leaking memory.

- [ ] **Step 1: Create `FileViewerModal`**

`apps/frontend/commons/src/ui/file-viewer-modal.tsx`:

```tsx
'use client';

import * as React from 'react';
import { API_URL } from '../api/base-api';
import { getAccessToken } from '../api/session';
import { Button } from './button';
import { Modal } from './modal';

export interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Relative URL from the gateway, e.g. "/files/<id>". */
  fileUrl: string;
  mimeType?: string;
  fileName?: string;
}

const INLINE_SAFE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

type ViewerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; objectUrl: string };

/**
 * Modal file viewer for genuinely uploaded documents (PDF/image/other) —
 * distinct from DocumentPreview, which renders the elaborated contract's
 * HTML body/header/footer, not a real file. Fetches the file as an
 * authenticated blob (the gateway only accepts a Bearer header) rather than
 * pointing <img>/<iframe> directly at fileUrl.
 */
export function FileViewerModal({
  open,
  onClose,
  title,
  fileUrl,
  mimeType,
  fileName,
}: FileViewerModalProps) {
  const [state, setState] = React.useState<ViewerState>({ status: 'loading' });

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let createdUrl: string | undefined;
    setState({ status: 'loading' });

    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${API_URL}${fileUrl}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`No se pudo cargar el archivo (${res.status}).`);
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', objectUrl: createdUrl });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Error desconocido.',
        });
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, fileUrl]);

  const isInlineSafe = mimeType ? INLINE_SAFE_TYPES.has(mimeType) : false;
  const isImage = mimeType?.startsWith('image/') ?? false;

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-3xl">
      {state.status === 'loading' ? (
        <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
      ) : state.status === 'error' ? (
        <p className="font-sans text-xs text-destructive">{state.message}</p>
      ) : isInlineSafe ? (
        isImage ? (
          <img
            src={state.objectUrl}
            alt={fileName ?? title}
            className="max-h-[70vh] w-full object-contain"
          />
        ) : (
          <iframe
            src={state.objectUrl}
            title={fileName ?? title}
            className="h-[70vh] w-full rounded-base border-2 border-border"
          />
        )
      ) : (
        <div className="space-y-3">
          <p className="font-sans text-xs text-muted-foreground">
            Este tipo de archivo no se puede previsualizar.
          </p>
          <Button asChild>
            <a href={state.objectUrl} download={fileName}>
              Descargar {fileName ?? 'archivo'}
            </a>
          </Button>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Export it from the package**

In `apps/frontend/commons/src/index.ts`, add near the other `./ui/*` exports:

```ts
export * from './ui/file-viewer-modal';
```

- [ ] **Step 3: Verify commons compiles**

Run: `pnpm --filter @aletheia/frontend-commons build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/commons/src/ui/file-viewer-modal.tsx apps/frontend/commons/src/index.ts
git commit -m "feat(commons): add FileViewerModal for previewing uploaded documents"
```

---

### Task 6: Wire the "Ver" button in documentos-mf

**Files:**
- Modify: `apps/frontend/microfrontends/documentos-mf/src/lib/types.ts`
- Modify: `apps/frontend/microfrontends/documentos-mf/src/lib/adapter.ts`
- Modify: `apps/frontend/microfrontends/documentos-mf/src/components/ui/icons.tsx`
- Modify: `apps/frontend/microfrontends/documentos-mf/src/features/document-upload/components/DocumentUploadRow.tsx`

**Interfaces:**
- Consumes: `FileViewerModal` (Task 5, from `@aletheia/frontend-commons`).
- Produces: `DocumentVersion.fileUrl` (UI type) now carries the value through from the API, used
  only within this task.

- [ ] **Step 1: Carry `fileUrl` through the UI-facing `DocumentVersion` type**

In `apps/frontend/microfrontends/documentos-mf/src/lib/types.ts`, add a field to the existing
`DocumentVersion` interface (right after `fileName`):

```ts
export interface DocumentVersion {
  /** Sequential version number, starting at 1. */
  version: number;
  fileName: string;
  /** Relative gateway URL, e.g. "/files/<id>" — used by FileViewerModal. */
  fileUrl: string;
  /** File size in bytes. */
  size: number;
  mimeType: string;
  /** User who uploaded this version (backend exposes only an id). */
  uploadedBy: string;
  /** ISO date string when it was uploaded. */
  uploadedAt: string;
}
```

- [ ] **Step 2: Populate it in the adapter**

In `apps/frontend/microfrontends/documentos-mf/src/lib/adapter.ts`, add `fileUrl` to `adaptVersion`:

```ts
export function adaptVersion(v: ApiDocumentVersion): DocumentVersion {
  return {
    version: v.version,
    fileName: fileNameFromUrl(v.fileUrl),
    fileUrl: v.fileUrl,
    size: v.fileSize ?? 0,
    mimeType: v.mimeType ?? 'application/octet-stream',
    uploadedBy: `Usuario #${v.uploadedById}`,
    uploadedAt: v.createdAt,
  };
}
```

- [ ] **Step 3: Add a local `EyeIcon`**

In `apps/frontend/microfrontends/documentos-mf/src/components/ui/icons.tsx`, add (this MF has no
`lucide-react` dependency — matches the existing inline-SVG convention already used by every other
icon in this file):

```tsx
export function EyeIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} aria-hidden="true" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
```

- [ ] **Step 4: Add the "Ver" button + `FileViewerModal` to `DocumentUploadRow`**

In `apps/frontend/microfrontends/documentos-mf/src/features/document-upload/components/DocumentUploadRow.tsx`:
- Add imports: `FileViewerModal` from `@aletheia/frontend-commons` (add to the existing
  `import { Badge, Button, Input } from '@aletheia/frontend-commons';` line), `EyeIcon` from
  `../../../components/ui/icons` (add to the existing icons import), and `useState` is already
  imported from `react`.
- Add local state for the viewer, and the button + modal inside the `isUploaded && active` block
  (currently lines 116-129):

```tsx
  const [viewerOpen, setViewerOpen] = useState(false);
```

```tsx
      {isUploaded && active ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-base border-2 border-border bg-secondary-background/40 p-3 font-sans text-xs text-foreground/70 sm:grid-cols-4">
          <span className="truncate" title={active.fileName}>
            {active.fileName}
          </span>
          <span>{formatBytes(active.size)}</span>
          <span>{formatMimeType(active.mimeType)}</span>
          <span>v{document.currentVersion}</span>
          {document.expiryDate ? (
            <span className="col-span-2 sm:col-span-4">
              Vigencia: {formatDate(document.expiryDate)}
            </span>
          ) : null}
          <Button
            variant="neutral"
            size="sm"
            className="col-span-2 sm:col-span-4"
            onClick={() => setViewerOpen(true)}
          >
            <EyeIcon className="h-3.5 w-3.5" />
            Ver documento
          </Button>
        </div>
      ) : (
```

Right after the row's outer closing `</div>` (before the component's final `);`), add the modal —
it only needs `active` (guaranteed defined while `viewerOpen` can be true, since the button that
sets it only renders when `isUploaded && active`):

```tsx
      {active ? (
        <FileViewerModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={requirement.label}
          fileUrl={active.fileUrl}
          mimeType={active.mimeType}
          fileName={active.fileName}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Verify documentos-mf compiles**

Run: `pnpm --filter documentos-mf build`
Expected: succeeds with no errors.

- [ ] **Step 6: Manual end-to-end verification**

With the dev stack running (backend from Task 3, frontend from Tasks 4-6): as Solicitante, upload a
PDF and a PNG in **Documentos**. For each, click **Ver documento** and confirm the modal shows the
actual content (PDF in an iframe, PNG as an image). Open the browser's Network tab and confirm the
request to `/files/<id>` carries an `Authorization` header. Then open the same `/files/<id>` URL
directly in a new private/incognito tab (no session) and confirm it's rejected with 401 — the file
is not reachable without authentication.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/microfrontends/documentos-mf/src/lib/types.ts apps/frontend/microfrontends/documentos-mf/src/lib/adapter.ts apps/frontend/microfrontends/documentos-mf/src/components/ui/icons.tsx apps/frontend/microfrontends/documentos-mf/src/features/document-upload/components/DocumentUploadRow.tsx
git commit -m "feat(documentos-mf): add a document viewer modal to uploaded rows"
```

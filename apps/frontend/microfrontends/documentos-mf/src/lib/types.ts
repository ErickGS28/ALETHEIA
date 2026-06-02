// Domain types for documentos-mf. UI text is in Spanish; code stays in English.
//
// Two layers live here:
//  - Api* types mirror the gateway payloads (already unwrapped by baseApi).
//  - The UI-facing types (DocumentRecord, DocumentVersion, ...) preserve the
//    shapes the existing components were built against, so the views stay intact.
//    Adapters in ./adapter map Api* -> UI types.

// ── Backend (gateway) shapes ───────────────────────────────────────────

/** Provider type as the backend expects it. */
export type BackendProviderType = 'FISICA' | 'MORAL';

/** GET /documents/:id/versions item / Document.versions item. */
export interface ApiDocumentVersion {
  id: number;
  version: number;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedById: number;
  createdAt: string;
}

/** GET /documents/:contractId item. */
export interface ApiDocument {
  id: number;
  contractId: number;
  name: string;
  type: string;
  isRequired: boolean;
  currentVersion: number;
  expiresAt?: string;
  createdAt: string;
  versions: ApiDocumentVersion[];
}

/** GET /documents/required?providerType= item. */
export interface ApiRequiredDoc {
  type: string;
  label: string;
}

/** Subset of GET /contracts item we use here. */
export interface ApiContract {
  id: number;
  folio: string;
  title: string;
  vendorName: string;
  providerType: BackendProviderType;
  status: string;
  area?: { id: number; name: string };
  society?: { id: number; name: string };
}

// ── UI-facing shapes (preserved from the mock) ─────────────────────────

/** Provider type as the UI rendered it. */
export type ProviderType = 'PERSONA_FISICA' | 'PERSONA_MORAL';

/** A single uploaded version of a document (UI shape). */
export interface DocumentVersion {
  /** Sequential version number, starting at 1. */
  version: number;
  fileName: string;
  /** File size in bytes. */
  size: number;
  mimeType: string;
  /** User who uploaded this version (backend exposes only an id). */
  uploadedBy: string;
  /** ISO date string when it was uploaded. */
  uploadedAt: string;
}

/** A document attached to a contract, with its version history (UI shape). */
export interface DocumentRecord {
  id: number;
  contractId: number;
  /** Catalog key / document type (INE, RFC, ...). */
  key: string;
  /** Human label resolved from the required-docs catalog when available. */
  label: string;
  /** Provider type the document was requested for (UI value). */
  providerType: ProviderType;
  /** Active (latest) version number. */
  currentVersion: number;
  /** Optional expiry date (ISO). */
  expiryDate?: string;
  /** Full version history (latest last). */
  versions: DocumentVersion[];
}

/** A required document slot for a provider type. */
export interface RequiredDocument {
  key: string;
  label: string;
  /** Whether an expiry date is typically tracked for this document. */
  tracksExpiry: boolean;
}

/** Vigencia (expiry) status computed against "today". */
export type ExpiryStatus = 'VIGENTE' | 'PROXIMO' | 'VENCIDO' | 'SIN_VIGENCIA';

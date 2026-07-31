// Adapters between the gateway payloads (Api*) and the UI-facing shapes
// the documentos-mf components were built against.
import { fileNameFromUrl } from './format';
import type {
  ApiContract,
  ApiDocument,
  ApiDocumentVersion,
  ApiRequiredDoc,
  BackendProviderType,
  DocumentRecord,
  DocumentVersion,
  ProviderType,
  RequiredDocument,
} from './types';

// ── Provider type mapping (mock <-> backend) ──────────────────────────

export function toBackendProviderType(pt: ProviderType): BackendProviderType {
  return pt === 'PERSONA_FISICA' ? 'FISICA' : 'MORAL';
}

export function toUiProviderType(pt: BackendProviderType): ProviderType {
  return pt === 'FISICA' ? 'PERSONA_FISICA' : 'PERSONA_MORAL';
}

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  PERSONA_FISICA: 'Persona Física',
  PERSONA_MORAL: 'Persona Moral',
};

// ── Expiry-tracking heuristic ─────────────────────────────────────────
// The backend's RequiredDoc only carries { type, label }; it does not say
// whether a document tracks expiry. We keep a small known set so the UI can
// still offer an expiry field for documents that typically have one.
const EXPIRY_TRACKING_TYPES = new Set([
  'INE',
  'COMPROBANTE_DOMICILIO',
  'CARATULA_ESTADO_CUENTA',
  'PODER_NOTARIAL',
]);

export function tracksExpiry(type: string): boolean {
  return EXPIRY_TRACKING_TYPES.has(type.toUpperCase());
}

// ── Required documents ────────────────────────────────────────────────

export function adaptRequiredDoc(doc: ApiRequiredDoc): RequiredDocument {
  return {
    key: doc.type,
    label: doc.label,
    tracksExpiry: tracksExpiry(doc.type),
  };
}

// ── Versions ──────────────────────────────────────────────────────────

export function adaptVersion(v: ApiDocumentVersion): DocumentVersion {
  return {
    version: v.version,
    fileName: fileNameFromUrl(v.fileUrl),
    size: v.fileSize ?? 0,
    mimeType: v.mimeType ?? 'application/octet-stream',
    uploadedBy: `Usuario #${v.uploadedById}`,
    uploadedAt: v.createdAt,
  };
}

// ── Documents ─────────────────────────────────────────────────────────

/**
 * Adapts a backend Document into the UI DocumentRecord.
 * `labels` resolves a human label from the required-docs catalog by type.
 * `providerType` comes from the owning contract (the document payload omits it).
 */
export function adaptDocument(
  doc: ApiDocument,
  providerType: ProviderType,
  labels: Record<string, string> = {},
): DocumentRecord {
  const versions = [...doc.versions].sort((a, b) => a.version - b.version).map(adaptVersion);
  return {
    id: doc.id,
    contractId: doc.contractId,
    key: doc.type,
    label: labels[doc.type] ?? doc.name ?? doc.type,
    providerType,
    currentVersion: doc.currentVersion,
    expiryDate: doc.expiresAt,
    versions,
  };
}

// ── Contracts (for the selector) ──────────────────────────────────────

export interface ContractOption {
  id: number;
  label: string;
  providerType: ProviderType;
}

export function adaptContractOption(c: ApiContract): ContractOption {
  const provider = PROVIDER_TYPE_LABELS[toUiProviderType(c.providerType)];
  return {
    id: c.id,
    label: `${c.folio} · ${c.title} (${provider})`,
    providerType: toUiProviderType(c.providerType),
  };
}

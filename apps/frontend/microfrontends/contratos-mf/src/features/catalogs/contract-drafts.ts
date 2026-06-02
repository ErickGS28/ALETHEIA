// Soporte para el editor de "Elaborar documento" (contract-editor).
//
// El backend NO expone un endpoint para persistir el cuerpo HTML elaborado de un contrato,
// por lo que el documento elaborado es una PREVISUALIZACIÓN / BORRADOR LOCAL y se guarda
// únicamente en este navegador (localStorage). Las PLANTILLAS y los CONTRATOS que alimentan
// el editor SÍ provienen del backend (GET /templates y GET /contracts vía RTK Query).

import { DEFAULT_PAGE_SETUP, type PageSetup } from '@aletheia/frontend-commons';

export const CONTRACT_DOCS_STORAGE_KEY = 'aletheia_contract_docs';

/** Documento elaborado de un contrato: cuerpo + diseño (header/footer/página). */
export interface ContractDoc {
  body: string;
  header: string;
  footer: string;
  pageSetup: PageSetup;
}

export function emptyContractDoc(): ContractDoc {
  return { body: '', header: '', footer: '', pageSetup: DEFAULT_PAGE_SETUP };
}

/** Migración suave: el formato viejo era un string (solo el cuerpo HTML). */
function normalizeDoc(raw: unknown): ContractDoc {
  if (typeof raw === 'string') return { ...emptyContractDoc(), body: raw };
  if (raw && typeof raw === 'object') {
    const d = raw as Partial<ContractDoc>;
    return {
      body: typeof d.body === 'string' ? d.body : '',
      header: typeof d.header === 'string' ? d.header : '',
      footer: typeof d.footer === 'string' ? d.footer : '',
      pageSetup:
        d.pageSetup && typeof d.pageSetup === 'object' && 'size' in d.pageSetup
          ? (d.pageSetup as PageSetup)
          : DEFAULT_PAGE_SETUP,
    };
  }
  return emptyContractDoc();
}

/** Lee el documento guardado de un contrato (si existe). */
export function readContractDoc(contractId: string): ContractDoc | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONTRACT_DOCS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, unknown>;
    if (!(contractId in map)) return null;
    return normalizeDoc(map[contractId]);
  } catch {
    return null;
  }
}

/** Persiste el documento editado de un contrato. */
export function writeContractDoc(contractId: string, doc: ContractDoc): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(CONTRACT_DOCS_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    map[contractId] = doc;
    window.localStorage.setItem(CONTRACT_DOCS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

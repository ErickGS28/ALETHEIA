/** Deterministic storage key for a contract's elaborated document (JSON). */
export function contractDocumentKey(contractId: number): string {
  return `contract-document-${contractId}.json`;
}

import type { SignatureMethod } from '../strategies/signature-strategy.interface';

/** Payload de creación de firma. */
export interface CreateSignatureDto {
  contractId: number;
  apoderadoId?: number;
  method?: SignatureMethod;
  signatureData: string;
}

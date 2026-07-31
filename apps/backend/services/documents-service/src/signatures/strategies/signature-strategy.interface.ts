/** Método de firma soportado. */
export type SignatureMethod = 'CANVAS' | 'ELECTRONIC';

/** Entrada de firma para la estrategia. */
export interface SignatureInput {
  signatureData: string;
}

/** Resultado normalizado de aplicar una estrategia de firma. */
export interface SignatureResult {
  method: SignatureMethod;
  signatureData: string;
}

/**
 * Patrón Strategy: cada método de firma valida/normaliza su payload de la
 * misma forma, permitiendo intercambiar la implementación sin tocar el service.
 */
export interface ISignatureStrategy {
  readonly method: SignatureMethod;
  sign(input: SignatureInput): SignatureResult;
}

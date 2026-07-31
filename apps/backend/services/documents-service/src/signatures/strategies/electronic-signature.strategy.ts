import { BadRequestException } from '@nestjs/common';
import type {
  ISignatureStrategy,
  SignatureInput,
  SignatureMethod,
  SignatureResult,
} from './signature-strategy.interface';

/**
 * Firma electrónica: acepta el payload de la firma (token/hash/cert) tal cual,
 * exigiendo únicamente que no venga vacío.
 */
export class ElectronicSignatureStrategy implements ISignatureStrategy {
  readonly method: SignatureMethod = 'ELECTRONIC';

  sign(input: SignatureInput): SignatureResult {
    const raw = input.signatureData?.trim();
    if (!raw) {
      throw new BadRequestException('El payload de la firma electrónica no puede estar vacío');
    }

    return { method: this.method, signatureData: raw };
  }
}

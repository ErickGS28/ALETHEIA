import { BadRequestException } from '@nestjs/common';
import type {
  ISignatureStrategy,
  SignatureInput,
  SignatureMethod,
  SignatureResult,
} from './signature-strategy.interface';

/**
 * Firma de canvas: el payload debe parecer un dataURL de imagen o base64.
 */
export class CanvasSignatureStrategy implements ISignatureStrategy {
  readonly method: SignatureMethod = 'CANVAS';

  private static readonly DATA_URL = /^data:image\/[a-z+]+;base64,/i;
  private static readonly BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

  sign(input: SignatureInput): SignatureResult {
    const raw = input.signatureData?.trim();
    if (!raw) {
      throw new BadRequestException('La firma de canvas no puede estar vacía');
    }

    const payload = CanvasSignatureStrategy.DATA_URL.test(raw) ? raw.split(',', 2)[1] : raw;

    if (!CanvasSignatureStrategy.BASE64.test(payload)) {
      throw new BadRequestException('La firma de canvas debe ser base64 o un dataURL válido');
    }

    return { method: this.method, signatureData: raw };
  }
}

import { Injectable } from '@nestjs/common';
import { CanvasSignatureStrategy } from './canvas-signature.strategy';
import { ElectronicSignatureStrategy } from './electronic-signature.strategy';
import type { ISignatureStrategy, SignatureMethod } from './signature-strategy.interface';

/**
 * Selector de estrategia de firma. Elige por `method`; CANVAS por defecto.
 */
@Injectable()
export class SignatureStrategyFactory {
  private readonly strategies: Record<SignatureMethod, ISignatureStrategy> = {
    CANVAS: new CanvasSignatureStrategy(),
    ELECTRONIC: new ElectronicSignatureStrategy(),
  };

  resolve(method?: SignatureMethod): ISignatureStrategy {
    return this.strategies[method ?? 'CANVAS'] ?? this.strategies.CANVAS;
  }
}

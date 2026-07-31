import { SIGNATURES_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { CreateSignatureDto } from './dto/signature.dto';
import { SignaturesService } from './signatures.service';

/**
 * Controlador de microservicio: responde a los mensajes Redis del gateway.
 * No expone HTTP — el borde REST vive en el gateway.
 */
@Controller()
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @MessagePattern(SIGNATURES_PATTERNS.CREATE)
  create(@Payload() payload: { dto: CreateSignatureDto; signedById: number }) {
    return this.signaturesService.create(payload.dto, payload.signedById);
  }

  @MessagePattern(SIGNATURES_PATTERNS.FIND_BY_CONTRACT)
  findByContract(@Payload() payload: { contractId: number }) {
    return this.signaturesService.findByContract(payload.contractId);
  }
}

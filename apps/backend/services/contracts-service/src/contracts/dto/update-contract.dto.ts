import type { CreateContractDto } from './create-contract.dto';

/**
 * Payload de actualización de contrato (solo permitido en estado DRAFT).
 * Todos los campos son opcionales — actualización parcial.
 */
export type UpdateContractDto = Partial<CreateContractDto>;

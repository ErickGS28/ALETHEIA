import type { ProviderType } from '../../../generated/prisma';

/**
 * Payload de creación de contrato.
 * La validación real (class-validator) vive en el gateway; aquí solo documenta la forma.
 */
export class CreateContractDto {
  title!: string;
  vendorName!: string;
  vendorEmail?: string;
  providerType!: ProviderType;
  areaId!: number;
  societyId!: number;
  templateId?: number;
}

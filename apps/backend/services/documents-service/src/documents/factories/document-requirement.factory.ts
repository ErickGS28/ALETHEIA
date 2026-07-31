/** Tipo de proveedor del contrato (espejo del enum Prisma de contracts). */
export type ProviderType = 'FISICA' | 'MORAL';

/** Una entrada del catálogo de documentos requeridos. */
export interface DocumentRequirement {
  type: string;
  label: string;
}

/**
 * Patrón Factory: resuelve la lista de documentos requeridos según el tipo de
 * proveedor (docs §15). Centraliza el catálogo para que el resto del servicio
 * no codifique las reglas a mano.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: patrón Factory explícito (requisito de patrones del curso)
export class DocumentRequirementFactory {
  private static readonly FISICA: DocumentRequirement[] = [
    { type: 'INE', label: 'INE / Identificación oficial' },
    { type: 'RFC', label: 'RFC' },
    { type: 'CURP', label: 'CURP' },
    { type: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de domicilio' },
    { type: 'CEDULA_FISCAL', label: 'Cédula de Situación Fiscal' },
    { type: 'ESTADO_CUENTA', label: 'Carátula de Estado de Cuenta' },
  ];

  private static readonly MORAL: DocumentRequirement[] = [
    { type: 'RFC', label: 'RFC' },
    { type: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de domicilio' },
    { type: 'ACTA_CONSTITUTIVA', label: 'Acta Constitutiva' },
    { type: 'PODER_NOTARIAL', label: 'Poder Notarial' },
    { type: 'CEDULA_FISCAL', label: 'Cédula de Situación Fiscal' },
    { type: 'ESTADO_CUENTA', label: 'Carátula de Estado de Cuenta' },
  ];

  static getRequired(providerType: ProviderType): DocumentRequirement[] {
    return providerType === 'MORAL'
      ? [...DocumentRequirementFactory.MORAL]
      : [...DocumentRequirementFactory.FISICA];
  }
}

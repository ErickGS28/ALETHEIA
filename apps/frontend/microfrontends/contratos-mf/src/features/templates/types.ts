// Tipo de plantilla que consume la UI (template-list / template-editor / contract-editor).
// El backend solo persiste { id, name, content, isActive, ... }; los campos de DISEÑO
// (header/footer/pageSetup) y la asociación a sociedad (societyId) no existen en el modelo
// del backend. Se conservan en el tipo de UI para no romper el render existente: se derivan
// con valores por defecto al mapear desde el backend.

import { DEFAULT_PAGE_SETUP, type PageSetup } from '@aletheia/frontend-commons';
import type { BackendTemplate } from '../api/templatesApi';

export interface Template {
  /** id de UI: string (el backend usa number). */
  id: string;
  name: string;
  /** No existe en backend; siempre null => plantilla "General" (aplica a cualquier sociedad). */
  societyId: string | null;
  active: boolean;
  /** Contenido HTML del cuerpo de la plantilla (proviene del backend). */
  content: string;
  /** Campos de diseño no persistidos en backend: valores por defecto. */
  header: string;
  footer: string;
  pageSetup: PageSetup;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_HEADER = '<p style="text-align:center"><strong>ALETHEIA</strong></p>';
export const DEFAULT_FOOTER =
  '<p style="text-align:center">Documento confidencial · Página {{page}}</p>';

/** Mapea la plantilla del backend al shape que espera la UI. */
export function toUiTemplate(t: BackendTemplate): Template {
  return {
    id: String(t.id),
    name: t.name,
    societyId: null,
    active: t.isActive,
    content: t.content,
    header: DEFAULT_HEADER,
    footer: DEFAULT_FOOTER,
    pageSetup: DEFAULT_PAGE_SETUP,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

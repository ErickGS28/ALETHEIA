// Sanitizado de HTML para el contenido enriquecido (plantillas / contratos).
// Se usa antes de renderizar HTML con dangerouslySetInnerHTML (vista previa,
// impresión). Reemplaza el sanitizado por-regex anterior, insuficiente ahora
// que el editor permite imágenes, enlaces y tablas.

import DOMPurify from 'dompurify';

// Permite el esquema `data:` (necesario para imágenes en base64). El `href`
// con `data:` se elimina aparte (ver hook) para evitar `data:text/html`.
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

let hookRegistered = false;

function ensureHook(): void {
  if (hookRegistered || typeof window === 'undefined') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (href.toLowerCase().startsWith('data:')) {
        node.removeAttribute('href');
      } else if (href) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
  hookRegistered = true;
}

/**
 * Sanea HTML autoría-controlada (plantillas/contratos) conservando el formato
 * del editor (imágenes base64, tablas, alineación, color). Devuelve '' en el
 * servidor: los consumidores renderizan solo tras montar para evitar mismatch.
 */
export function sanitizeDocumentHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return '';
  ensureHook();
  return DOMPurify.sanitize(html, {
    ADD_ATTR: [
      'target',
      'colspan',
      'rowspan',
      'data-variable',
      'data-page-break',
      'contenteditable',
    ],
    ALLOWED_URI_REGEXP,
  });
}

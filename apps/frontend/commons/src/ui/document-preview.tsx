'use client';

import { Printer } from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';
import { sanitizeDocumentHtml } from '../utils/sanitize';
import { Button } from './button';
import { PAGE_DIMENSIONS, type PageSetup } from './page-setup';

export interface DocumentPreviewProps {
  body: string;
  header?: string;
  footer?: string;
  pageSetup: PageSetup;
  className?: string;
}

const PRINT_STYLE_ID = 'clm-print-style';

/**
 * Vista previa del documento como "hoja" (tamaño + márgenes) con encabezado y
 * pie, y botón de impresión / Guardar PDF. En impresión, header/footer se fijan
 * (`position: fixed`) para repetirse en cada hoja (mejor soporte en Chrome).
 */
export function DocumentPreview({
  body,
  header,
  footer,
  pageSetup,
  className,
}: DocumentPreviewProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const dim = PAGE_DIMENSIONS[pageSetup.size];
  const m = pageSetup.margins;

  const handlePrint = () => {
    document.getElementById(PRINT_STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      @page { size: ${dim.css}; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }
      @media print {
        body * { visibility: hidden !important; }
        #clm-print-sheet, #clm-print-sheet * { visibility: visible !important; }
        #clm-print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        #clm-print-sheet .clm-sheet-page {
          box-shadow: none !important; border: none !important;
          padding: 0 !important; width: auto !important; min-height: 0 !important; margin: 0 !important;
        }
        .clm-print-header { position: fixed; top: 0; left: 0; right: 0; }
        .clm-print-footer { position: fixed; bottom: 0; left: 0; right: 0; }
        .clm-page-number::before { content: counter(page); }
      }
    `;
    document.head.appendChild(style);
    const cleanup = () => {
      style.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  // {{page}} → contador de página (se resuelve solo al imprimir).
  const footerHtml = (footer ?? '').replace(
    /\{\{\s*page\s*\}\}/g,
    '<span class="clm-page-number"></span>',
  );

  if (!mounted) {
    return (
      <div
        className={cn(
          'rounded-base border-2 border-border bg-secondary-background p-6 text-center font-sans text-xs text-foreground/50',
          className,
        )}
      >
        Cargando vista previa…
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex justify-end">
        <Button type="button" variant="neutral" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="overflow-x-auto rounded-base border-2 border-border bg-secondary-background p-4">
        <div id="clm-print-sheet" className="mx-auto w-fit">
          <div
            className="clm-sheet-page mx-auto border-2 border-border bg-background shadow-shadow"
            style={{
              width: `${dim.width}mm`,
              minHeight: `${dim.height}mm`,
              paddingTop: `${m.top}mm`,
              paddingRight: `${m.right}mm`,
              paddingBottom: `${m.bottom}mm`,
              paddingLeft: `${m.left}mm`,
            }}
          >
            {header ? (
              <div
                className="clm-print-header prose-clm mb-3 border-b-2 border-border/30 pb-2 text-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: saneado con DOMPurify.
                dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(header) }}
              />
            ) : null}

            <div
              className="prose-clm text-sm"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: saneado con DOMPurify.
              dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(body) }}
            />

            {footer ? (
              <div
                className="clm-print-footer prose-clm mt-3 border-t-2 border-border/30 pt-2 text-xs"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: saneado con DOMPurify.
                dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(footerHtml) }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

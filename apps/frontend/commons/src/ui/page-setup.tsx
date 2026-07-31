'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSetup {
  size: 'A4' | 'LETTER';
  margins: PageMargins; // en mm
}

export const DEFAULT_PAGE_SETUP: PageSetup = {
  size: 'A4',
  margins: { top: 25, right: 25, bottom: 25, left: 25 },
};

/** Dimensiones de la hoja (mm) + keyword CSS `size` para `@page`. */
export const PAGE_DIMENSIONS: Record<
  PageSetup['size'],
  { width: number; height: number; label: string; css: string }
> = {
  A4: { width: 210, height: 297, label: 'A4', css: 'A4' },
  LETTER: { width: 215.9, height: 279.4, label: 'Carta', css: 'letter' },
};

const SELECT_CLS =
  'h-9 w-full rounded-base border-2 border-border bg-background px-2 text-sm font-base shadow-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';
const NUM_CLS =
  'h-9 w-full rounded-base border-2 border-border bg-background px-2 text-sm shadow-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

const MARGIN_FIELDS: Array<[keyof PageMargins, string]> = [
  ['top', 'Sup.'],
  ['right', 'Der.'],
  ['bottom', 'Inf.'],
  ['left', 'Izq.'],
];

export interface PageSetupControlProps {
  value: PageSetup;
  onChange: (next: PageSetup) => void;
  className?: string;
}

/** Control de tamaño de página (A4/Carta) + márgenes (mm). */
export function PageSetupControl({ value, onChange, className }: PageSetupControlProps) {
  const setSize = (size: PageSetup['size']) => onChange({ ...value, size });
  const setMargin = (key: keyof PageMargins, raw: string) => {
    const n = Number.parseInt(raw, 10);
    onChange({
      ...value,
      margins: { ...value.margins, [key]: Number.isFinite(n) && n >= 0 ? n : 0 },
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-xs font-base">Tamaño de página</span>
          <select
            className={SELECT_CLS}
            value={value.size}
            onChange={(e) => setSize(e.target.value as PageSetup['size'])}
          >
            <option value="A4">A4 (210 × 297 mm)</option>
            <option value="LETTER">Carta (8.5 × 11 in)</option>
          </select>
        </label>
      </div>
      <div>
        <span className="block text-xs font-base">Márgenes (mm)</span>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {MARGIN_FIELDS.map(([key, label]) => (
            <label key={key} className="space-y-1 text-center">
              <span className="block font-sans text-[0.65rem] text-foreground/60">{label}</span>
              <input
                type="number"
                min={0}
                className={NUM_CLS}
                value={value.margins[key]}
                onChange={(e) => setMargin(key, e.target.value)}
                aria-label={`Margen ${label}`}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

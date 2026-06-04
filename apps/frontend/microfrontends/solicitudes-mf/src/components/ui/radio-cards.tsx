'use client';

import { cn } from '@aletheia/frontend-commons';
import { Check } from 'lucide-react';

// Local card-style single-select (radio) group. Neobrutalism look.

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface RadioCardsProps<T extends string> {
  name: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function RadioCards<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
}: RadioCardsProps<T>) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)} role="radiogroup">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-start gap-2 rounded-base border-2 border-border px-3 py-2 text-left transition-all',
              selected
                ? 'bg-main text-main-foreground shadow-none translate-x-[2px] translate-y-[2px]'
                : 'bg-background shadow-shadow hover:bg-secondary-background',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-border',
                selected ? 'bg-background' : 'bg-background',
              )}
            >
              {selected && <Check className="h-3 w-3 text-foreground" strokeWidth={3} />}
            </span>
            <span>
              <span className="block font-heading text-sm leading-tight">{opt.label}</span>
              {opt.hint && (
                <span
                  className={cn(
                    'block font-sans text-[11px]',
                    selected ? 'text-main-foreground/80' : 'text-foreground/50',
                  )}
                >
                  {opt.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

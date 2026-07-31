'use client';

import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.ComponentProps<'select'> {
  /** Opcional: lista de opciones declarativa. Si se omite, usa `children` (<option>). */
  options?: SelectOption[];
  placeholder?: string;
}

/**
 * Select nativo estilizado con chevron. Canónico del design system:
 * reemplaza las 6 copias locales por-MF. Accesible por defecto (select nativo).
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full appearance-none rounded-base border-2 border-border bg-background pl-3 pr-9 text-sm font-sans',
          'shadow-sm transition-all ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-destructive',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground/60"
        aria-hidden="true"
      />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };

'use client';

import { cn } from '@aletheia/frontend-commons';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  /** Placeholder option rendered first (e.g. "Todos"). */
  placeholder?: string;
}

/**
 * Native <select> styled to match the Neobrutalism design system.
 * Local to reportes-mf (no shared Select primitive exists in commons).
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-base border-2 border-border bg-background px-3 py-2 pr-9 text-sm font-sans',
            'shadow-shadow transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };

'use client';

import { cn } from '@aletheia/frontend-commons';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

// Local neobrutalism-styled native <select>. Kept local to solicitudes-mf
// (commons is shared and must not gain new primitives for this MF).

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
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
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };

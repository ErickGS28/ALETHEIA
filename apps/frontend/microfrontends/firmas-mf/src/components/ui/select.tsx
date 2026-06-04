'use client';

import { cn } from '@aletheia/frontend-commons';
import * as React from 'react';

/**
 * Select nativo con estética Neobrutalism, local al firmas-mf.
 * (commons no exporta un Select; este primitive vive aquí por las reglas del MF.)
 */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-base border-2 border-border bg-background px-3 py-2 text-sm font-sans ring-offset-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'shadow-shadow transition-all',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';

export { Select };

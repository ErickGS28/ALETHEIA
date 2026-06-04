'use client';

import { cn } from '@aletheia/frontend-commons';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

/**
 * Neobrutalism native <select>. Local to admin-mf (no nuevo primitive en commons).
 * Mantiene el look del Input compartido: borde grueso, sombra dura, fuente mono.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
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

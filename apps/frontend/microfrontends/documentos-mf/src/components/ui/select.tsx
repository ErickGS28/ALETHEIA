'use client';

import { cn } from '@aletheia/frontend-commons';
import * as React from 'react';

/**
 * Local Neobrutalism Select built on a native <select>.
 * Lives in the MF (not commons) per the "new primitives stay local" rule.
 */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => {
    return (
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
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };

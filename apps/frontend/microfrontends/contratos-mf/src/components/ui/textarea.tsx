'use client';

import { cn } from '@aletheia/frontend-commons';
import * as React from 'react';

/** Textarea con estética Neobrutalism (local al MF). */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[120px] w-full rounded-base border-2 border-border bg-background px-3 py-2 text-sm font-sans',
          'placeholder:text-foreground/40 placeholder:font-sans',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'shadow-shadow transition-all',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };

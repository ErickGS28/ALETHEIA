'use client';

import { cn } from '@aletheia/frontend-commons';
import * as React from 'react';

/** Label de formulario (local al MF). */
const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<'label'>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-xs font-heading tracking-widest uppercase text-foreground/70',
          className,
        )}
        {...props}
      />
    );
  },
);
Label.displayName = 'Label';

export { Label };

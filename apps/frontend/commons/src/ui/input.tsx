'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-base border-2 border-border bg-background px-3 py-2 text-sm font-sans ring-offset-white',
          'placeholder:text-foreground/40 placeholder:font-sans',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'shadow-shadow transition-all',
          'file:border-0 file:bg-transparent file:text-sm file:font-base',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };

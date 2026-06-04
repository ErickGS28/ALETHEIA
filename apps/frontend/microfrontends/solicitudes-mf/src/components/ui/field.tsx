'use client';

import { cn } from '@aletheia/frontend-commons';
import type * as React from 'react';

// Local form field wrapper: label + control + optional hint/error.

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block font-heading text-xs tracking-widest uppercase text-foreground/70"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="font-sans text-xs text-foreground/50">{hint}</p>}
      {error && <p className="font-sans text-xs text-red-600">{error}</p>}
    </div>
  );
}

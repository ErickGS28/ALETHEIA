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
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="font-sans text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="font-sans text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

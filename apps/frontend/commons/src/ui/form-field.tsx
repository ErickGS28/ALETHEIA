'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { Label } from './label';

export interface FormFieldProps {
  /** Texto de la etiqueta. */
  label: React.ReactNode;
  /** id del control asociado (htmlFor de la etiqueta). */
  htmlFor?: string;
  /** Marca el campo como obligatorio (muestra asterisco y aria). */
  required?: boolean;
  /** Mensaje de error; cuando se define, aplica estilo y aria-invalid al control hijo. */
  error?: string | null;
  /** Ayuda secundaria bajo la etiqueta. */
  hint?: string;
  className?: string;
  /** Un único control (Input/Select/Textarea). Se le inyecta aria-invalid/aria-describedby. */
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * Envoltura de campo de formulario canónica: etiqueta + marca de obligatorio +
 * control + ayuda + error accesible. Unifica la UX de formularios entre módulos.
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const reactId = React.useId();
  const childProps = children.props;
  const controlId = htmlFor ?? (childProps.id as string | undefined) ?? reactId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean);
  const existingDescribedBy = childProps['aria-describedby'] as string | undefined;
  const mergedDescribedBy =
    [...describedBy, existingDescribedBy].filter(Boolean).join(' ') || undefined;

  const child = React.cloneElement(children, {
    id: controlId,
    'aria-invalid': error ? true : (childProps['aria-invalid'] as boolean | undefined),
    'aria-describedby': mergedDescribedBy,
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={controlId}>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-xs font-sans text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {child}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-sans text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

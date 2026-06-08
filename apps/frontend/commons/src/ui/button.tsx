'use client';

import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../utils/cn';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-base text-sm font-base transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-main border-2 border-border text-main-foreground shadow-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        accent:
          'bg-accent border-2 border-border text-accent-foreground shadow-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        destructive:
          'bg-destructive border-2 border-border text-destructive-foreground shadow-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        outline:
          'border-2 border-border bg-background text-foreground shadow-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        secondary:
          'bg-secondary-background border-2 border-border text-foreground shadow-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        neutral:
          'bg-background border-2 border-border text-foreground shadow-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        ghost: 'hover:bg-secondary-background text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
        noShadow:
          'border-2 border-border bg-background text-foreground hover:bg-secondary-background',
        reverse:
          'bg-main border-2 border-background text-main-foreground shadow-reverse hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Muestra un spinner, deshabilita y marca aria-busy sin cambiar el ancho. */
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    // Con asChild, Slot exige un único hijo: no podemos inyectar el spinner.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }), 'relative')}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" />
          </span>
        )}
        <span className={cn('inline-flex items-center gap-2', isLoading && 'opacity-0')}>
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

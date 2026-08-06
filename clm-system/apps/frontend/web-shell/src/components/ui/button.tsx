'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-base text-sm font-base transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-main border-2 border-border text-main-foreground shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        destructive:
          'bg-foreground border-2 border-border text-background shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        outline:
          'border-2 border-border bg-background text-foreground shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        secondary:
          'bg-secondary-background border-2 border-border text-foreground shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        neutral:
          'bg-background border-2 border-border text-foreground shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        ghost: 'hover:bg-secondary-background text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
        noShadow: 'border-2 border-border bg-background text-foreground hover:bg-secondary-background',
        reverse:
          'bg-main border-2 border-background text-main-foreground shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

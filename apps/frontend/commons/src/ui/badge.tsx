import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-base border-2 border-border px-2.5 py-0.5 text-xs font-heading transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-main text-main-foreground shadow-shadow',
        secondary: 'bg-secondary-background text-foreground shadow-shadow',
        destructive: 'bg-foreground text-background shadow-shadow',
        neutral: 'bg-background text-foreground',
        outline: 'bg-background text-foreground border-foreground/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

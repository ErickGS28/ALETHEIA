import * as React from 'react';
import { cn } from '../utils/cn';

/** Placeholder de carga (animate-pulse) para reducir layout shift percibido. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-base bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };

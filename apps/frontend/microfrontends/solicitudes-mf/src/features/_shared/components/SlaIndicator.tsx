'use client';

import { cn } from '@aletheia/frontend-commons';
import { SLA_META, type SlaLevel } from '../domain/contract';

// SLA semaphore (simulated). Inline span + dot, safe inside <p>.

export function SlaIndicator({
  level,
  showLabel = true,
  className,
}: {
  level: SlaLevel;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = SLA_META[level];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={meta.label}>
      <span
        className={cn('inline-block h-2.5 w-2.5 rounded-full border border-border', meta.dot)}
      />
      {showLabel && <span className={cn('font-sans text-xs', meta.text)}>{meta.label}</span>}
    </span>
  );
}

'use client';

import { cn } from '@aletheia/frontend-commons';
import { type ContractStatus, STATUS_COLOR, STATUS_LABEL } from '../domain/contract';

// Status pill. Renders a <span> (NOT a Badge/div) so it is safe inside <p>.

export function StatusBadge({ status, className }: { status: ContractStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-base border-2 border-border px-2 py-0.5 font-heading text-[10px] tracking-widest',
        STATUS_COLOR[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

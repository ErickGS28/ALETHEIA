'use client';

import { Clock } from 'lucide-react';
import type { AuditEntry } from '../../_shared/domain/contract';
import { formatDateTime } from '../../_shared/lib/format';

// Chronological audit trail (bitácora). Most recent last.

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="font-mono text-sm text-foreground/50">Sin movimientos registrados.</p>;
  }

  return (
    <ol className="space-y-0">
      {entries.map((entry, i) => {
        const last = i === entries.length - 1;
        return (
          <li key={`${entry.date}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {/* connector */}
            {!last && (
              <span className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border" aria-hidden />
            )}
            <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground">
              <Clock className="h-3 w-3" />
            </span>
            <div className="-mt-0.5 space-y-0.5">
              <p className="font-base text-sm">{entry.action}</p>
              <p className="font-mono text-xs text-foreground/50">
                {entry.user} · {formatDateTime(entry.date)}
              </p>
              {entry.note && (
                <p className="mt-1 rounded-base border-2 border-border bg-secondary-background px-2 py-1 font-mono text-xs text-foreground/70">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

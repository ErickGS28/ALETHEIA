'use client';

import { Badge } from '@aletheia/frontend-commons';
import { auditActionLabel } from '../../../lib/contract-meta';
import { formatDateTime } from '../../../lib/format';
import type { AuditLog } from '../../contract-reports/api/reportsApi';

interface AuditTimelineProps {
  entries: AuditLog[];
}

export function AuditTimeline({ entries }: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-foreground/60">
        Este contrato no tiene acciones registradas en la bitácora.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:bg-border">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pl-8">
          <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-border bg-main" />
          <div className="rounded-base border-2 border-border bg-background p-4 shadow-shadow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="neutral" className="font-heading">
                {auditActionLabel(entry.action)}
              </Badge>
              <time className="font-sans text-xs text-foreground/60">
                {formatDateTime(entry.createdAt)}
              </time>
            </div>
            <div className="mt-2 font-sans text-sm text-foreground/70">
              Por Usuario #{entry.userId}
            </div>
            {entry.detail && (
              <div className="mt-2 rounded-base border-2 border-border bg-secondary-background px-2 py-1 font-sans text-xs text-foreground/70">
                {entry.detail}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

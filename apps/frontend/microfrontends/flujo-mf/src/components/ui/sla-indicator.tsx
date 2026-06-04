'use client';

import { cn } from '@aletheia/frontend-commons';
import {
  type SlaLevel,
  type SlaResult,
  formatDuration,
} from '../../features/_shared/workflow-rules';

const DOT_COLORS: Record<SlaLevel, string> = {
  green: 'bg-[#16a34a]',
  yellow: 'bg-[#eab308]',
  red: 'bg-[#dc2626]',
  none: 'bg-foreground/30',
};

const BAR_COLORS: Record<SlaLevel, string> = {
  green: 'bg-[#16a34a]',
  yellow: 'bg-[#eab308]',
  red: 'bg-[#dc2626]',
  none: 'bg-foreground/30',
};

/** Small colored dot + label representing the SLA semaphore (HU-12). */
export function SlaDot({ sla, showLabel = true }: { sla: SlaResult; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn('h-3 w-3 rounded-full border-2 border-border', DOT_COLORS[sla.level])}
        aria-hidden
      />
      {showLabel ? <span className="font-sans text-xs text-foreground/70">{sla.label}</span> : null}
    </span>
  );
}

/** Full SLA visualization: dot, label, progress bar and elapsed/budget. */
export function SlaIndicator({ sla }: { sla: SlaResult }) {
  if (sla.level === 'none' || sla.slaHours == null || sla.ratio == null) {
    return (
      <div className="space-y-1">
        <SlaDot sla={sla} />
        <p className="font-sans text-xs text-foreground/40">Etapa sin SLA configurado</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round(sla.ratio * 100));
  const overdue = sla.remainingHours != null && sla.remainingHours < 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <SlaDot sla={sla} />
        <span className="font-sans text-xs text-foreground/60">{Math.round(sla.ratio * 100)}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-base border-2 border-border bg-background"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn('h-full', BAR_COLORS[sla.level])} style={{ width: `${pct}%` }} />
      </div>
      <p className="font-sans text-xs text-foreground/50">
        {formatDuration(sla.elapsedHours)} de {sla.slaHours} h
        {overdue
          ? ` · vencido por ${formatDuration(Math.abs(sla.remainingHours ?? 0))}`
          : ` · restan ${formatDuration(sla.remainingHours ?? 0)}`}
      </p>
    </div>
  );
}

/** Compact inline badge-like SLA for table rows. */
export function SlaBadge({ sla }: { sla: SlaResult }) {
  if (sla.level === 'none') {
    return <span className="font-sans text-xs text-foreground/40">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn('h-3 w-3 rounded-full border-2 border-border', DOT_COLORS[sla.level])}
        aria-hidden
      />
      <span className="font-sans text-xs text-foreground/70">
        {sla.ratio != null ? `${Math.round(sla.ratio * 100)}%` : ''}
      </span>
    </span>
  );
}

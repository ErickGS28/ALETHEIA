'use client';

import { Card, CardContent, cn } from '@aletheia/frontend-commons';
import type { SlaLevel } from '../../_shared/workflow-rules';

interface SlaSummaryProps {
  counts: Record<SlaLevel, number>;
}

const CARDS: { level: Exclude<SlaLevel, 'none'>; label: string; dot: string; help: string }[] = [
  { level: 'green', label: 'En tiempo', dot: 'bg-success', help: 'Menos del 60% del SLA' },
  { level: 'yellow', label: 'Por vencer', dot: 'bg-warning', help: 'Entre 60% y 100% del SLA' },
  { level: 'red', label: 'SLA superado', dot: 'bg-destructive', help: '100% o más del SLA' },
];

/** Three-color summary of the SLA semaphore (HU-12). */
export function SlaSummary({ counts }: SlaSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CARDS.map((c) => (
        <Card key={c.level}>
          <CardContent className="flex items-center gap-4 py-5">
            <span
              className={cn('h-6 w-6 rounded-full border-2 border-border', c.dot)}
              aria-hidden
            />
            <div>
              <p className="font-heading text-2xl leading-none">{counts[c.level] ?? 0}</p>
              <p className="font-sans text-sm text-foreground/80">{c.label}</p>
              <p className="font-sans text-xs text-muted-foreground">{c.help}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

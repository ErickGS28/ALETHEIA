'use client';

import { Badge, cn } from '@aletheia/frontend-commons';
import { ArrowRightIcon } from '../../../components/ui/icons';
import type { TransitionAction, WorkflowTransition } from '../../_shared/adapters';
import { ACTION_LABELS, STATUS_LABELS, formatDateTime } from '../../_shared/workflow-rules';

const ACTION_DOT: Record<TransitionAction, string> = {
  SUBMIT: 'bg-main',
  APPROVE: 'bg-[#16a34a]',
  RETURN: 'bg-[#eab308]',
  REJECT: 'bg-[#dc2626]',
  RECOVER: 'bg-foreground',
};

const ACTION_BADGE: Record<TransitionAction, 'default' | 'secondary' | 'destructive' | 'neutral'> =
  {
    SUBMIT: 'secondary',
    APPROVE: 'default',
    RETURN: 'neutral',
    REJECT: 'destructive',
    RECOVER: 'neutral',
  };

/** Chronological vertical timeline of a contract's transitions (oldest → newest). */
export function TimelineList({ transitions }: { transitions: WorkflowTransition[] }) {
  return (
    <ol className="relative space-y-6 border-l-2 border-border pl-6">
      {transitions.map((tr) => (
        <li key={tr.id} className="relative">
          {/* Node */}
          <span
            className={cn(
              'absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-border',
              ACTION_DOT[tr.action],
            )}
            aria-hidden
          />
          <div className="space-y-2 rounded-base border-2 border-border bg-background p-4 shadow-shadow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={ACTION_BADGE[tr.action]}>{ACTION_LABELS[tr.action]}</Badge>
              <span className="font-sans text-xs text-foreground/50">
                {formatDateTime(tr.timestamp)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-sans text-sm">
              <Badge variant="outline">{STATUS_LABELS[tr.from]}</Badge>
              <ArrowRightIcon className="h-4 w-4 text-foreground/60" />
              <Badge variant="outline">{STATUS_LABELS[tr.to]}</Badge>
            </div>

            <p className="font-sans text-xs text-foreground/60">
              Por <span className="text-foreground/90">{tr.performedBy}</span>
            </p>

            {tr.comment ? (
              <p className="rounded-base border-2 border-border bg-secondary-background px-3 py-2 font-sans text-xs text-foreground/80">
                “{tr.comment}”
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

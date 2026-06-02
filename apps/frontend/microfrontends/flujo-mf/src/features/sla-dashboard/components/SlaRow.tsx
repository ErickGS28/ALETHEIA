'use client';

import { Badge, TableCell, TableRow } from '@aletheia/frontend-commons';
import Link from 'next/link';
import { useEffect } from 'react';
import { SlaBadge, SlaIndicator } from '../../../components/ui/sla-indicator';
import type { WorkflowContract } from '../../_shared/adapters';
import { useContractWorkflow } from '../../_shared/useWorkflow';
import { STATUS_LABELS, type SlaLevel, formatDuration } from '../../_shared/workflow-rules';

interface SlaRowProps {
  contract: WorkflowContract;
  /** Reports the resolved SLA level so the parent can aggregate the summary. */
  onLevel: (id: string, level: SlaLevel) => void;
}

/** One SLA table row; fetches the real semaphore color from /workflow/:id. */
export function SlaRow({ contract, onLevel }: SlaRowProps) {
  const { sla, isError } = useContractWorkflow(contract.id);

  useEffect(() => {
    if (sla) onLevel(contract.id, sla.level);
  }, [sla, contract.id, onLevel]);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/timeline?contract=${contract.id}`} className="font-heading hover:underline">
          {contract.folio}
        </Link>
        <span className="block text-xs text-foreground/50">{contract.provider}</span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{STATUS_LABELS[contract.status]}</Badge>
      </TableCell>
      <TableCell>{sla ? formatDuration(sla.elapsedHours) : isError ? '—' : '…'}</TableCell>
      <TableCell>{sla?.slaHours != null ? `${sla.slaHours} h` : '—'}</TableCell>
      <TableCell className="min-w-40">
        {sla ? (
          <SlaIndicator sla={sla} />
        ) : isError ? (
          <Badge variant="destructive">SLA no disponible</Badge>
        ) : (
          <span className="font-mono text-xs text-foreground/40">Calculando…</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {sla ? (
          <SlaBadge sla={sla} />
        ) : (
          <span className="font-mono text-xs text-foreground/40">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

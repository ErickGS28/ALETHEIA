'use client';

import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@aletheia/frontend-commons';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageShell } from '../../../components/PageShell';
import { TimelineIcon } from '../../../components/ui/icons';
import { providerTypeLabel } from '../../_shared/adapters';
import { errorMessage, useContractWorkflow, useWorkflow } from '../../_shared/useWorkflow';
import { STATUS_LABELS, statusBadgeVariant } from '../../_shared/workflow-rules';
import { TimelineList } from './TimelineList';

export function WorkflowTimeline() {
  const wf = useWorkflow();
  const searchParams = useSearchParams();
  const initial = searchParams.get('contract');

  const [selectedId, setSelectedId] = useState<string | null>(initial);

  // Default to the first contract once loaded if nothing valid is selected.
  useEffect(() => {
    if (!wf.hydrated) return;
    if (selectedId && wf.getContract(selectedId)) return;
    const first = wf.contracts[0];
    setSelectedId(first ? first.id : null);
  }, [wf.hydrated, wf.contracts, wf.getContract, selectedId]);

  const contract = selectedId ? wf.getContract(selectedId) : undefined;
  const detail = useContractWorkflow(selectedId);
  const transitions = detail.transitions;
  // The workflow detail carries the live status; fall back to the listed contract.
  const status = detail.workflow?.status ?? contract?.status;

  return (
    <PageShell
      title="Línea de tiempo del flujo"
      subtitle="Historial cronológico de transiciones de un contrato"
      active="timeline"
    >
      {!wf.hydrated ? (
        <Card>
          <CardContent className="pt-6">
            <LoadingState message="Cargando historial…" />
          </CardContent>
        </Card>
      ) : wf.isError ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState message={errorMessage(wf.error)} onRetry={() => wf.refetch()} />
          </CardContent>
        </Card>
      ) : wf.contracts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<TimelineIcon className="h-10 w-10" />}
              title="No hay contratos"
              description="No existen contratos para mostrar su historial."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecciona un contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {wf.contracts.map((c) => {
                  const isActive = c.id === selectedId;
                  return (
                    <Button
                      key={c.id}
                      variant={isActive ? 'default' : 'neutral'}
                      size="sm"
                      onClick={() => setSelectedId(c.id)}
                    >
                      {c.folio}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {contract ? (
            <Card>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{contract.folio}</CardTitle>
                    <p className="font-sans text-sm text-foreground/80">{contract.provider}</p>
                    <p className="font-sans text-xs text-muted-foreground">
                      {contract.society} · {contract.area} ·{' '}
                      {providerTypeLabel(contract.providerType)}
                    </p>
                  </div>
                  {status ? (
                    <Badge variant={statusBadgeVariant(status)}>{STATUS_LABELS[status]}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {detail.isLoading ? (
                  <LoadingState message="Cargando transiciones…" />
                ) : detail.isError ? (
                  <ErrorState message={errorMessage(detail.error)} />
                ) : transitions.length === 0 ? (
                  <p className="font-sans text-sm text-muted-foreground">
                    Este contrato aún no tiene transiciones registradas.
                  </p>
                ) : (
                  <>
                    <p className="mb-6 font-sans text-xs text-muted-foreground">
                      {transitions.length} transicion{transitions.length === 1 ? '' : 'es'} · orden
                      cronológico (más antigua arriba)
                    </p>
                    <TimelineList transitions={transitions} />
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          <div>
            <BackButton href="/" label="Volver al panel de revisión" />
          </div>
        </>
      )}
    </PageShell>
  );
}

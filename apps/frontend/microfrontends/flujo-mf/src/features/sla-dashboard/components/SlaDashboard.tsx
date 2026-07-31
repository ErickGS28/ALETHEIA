'use client';

import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@aletheia/frontend-commons';
import { useCallback, useMemo, useState } from 'react';
import { PageShell } from '../../../components/PageShell';
import { GaugeIcon } from '../../../components/ui/icons';
import { errorMessage, useWorkflow } from '../../_shared/useWorkflow';
import { SLA_TRACKED_STATUSES, type SlaLevel } from '../../_shared/workflow-rules';
import { SlaRow } from './SlaRow';
import { SlaSummary } from './SlaSummary';

export function SlaDashboard() {
  const wf = useWorkflow();

  // Resolved SLA level per contract (reported by each SlaRow as its
  // /workflow/:id query settles), used to aggregate the color summary.
  const [levels, setLevels] = useState<Record<string, SlaLevel>>({});
  const onLevel = useCallback((id: string, level: SlaLevel) => {
    setLevels((prev) => (prev[id] === level ? prev : { ...prev, [id]: level }));
  }, []);

  const rows = useMemo(() => (wf.hydrated ? wf.listByStatus(SLA_TRACKED_STATUSES) : []), [wf]);

  const counts = useMemo(() => {
    const acc: Record<SlaLevel, number> = { green: 0, yellow: 0, red: 0, none: 0 };
    for (const r of rows) {
      const level = levels[r.id] ?? 'none';
      acc[level] += 1;
    }
    return acc;
  }, [rows, levels]);

  return (
    <PageShell
      title="Semáforo SLA"
      subtitle="Tiempo de cada contrato en su etapa actual frente al SLA (en tiempo real)"
      active="sla"
      actions={
        <Button
          variant="neutral"
          size="sm"
          disabled={wf.isFetching}
          onClick={() => wf.refetch()}
          title="Actualizar"
        >
          {wf.isFetching ? 'Actualizando…' : 'Actualizar'}
        </Button>
      }
    >
      {!wf.hydrated ? (
        <Card>
          <CardContent className="pt-6">
            <LoadingState message="Cargando indicadores…" />
          </CardContent>
        </Card>
      ) : wf.isError ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState message={errorMessage(wf.error)} onRetry={() => wf.refetch()} />
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<GaugeIcon className="h-10 w-10" />}
              title="No hay contratos en revisión"
              description="No existen contratos en etapas con SLA para mostrar."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <SlaSummary counts={counts} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GaugeIcon className="h-5 w-5" />
                Contratos en revisión ({rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Transcurrido</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Consumo</TableHead>
                      <TableHead className="text-right">Indicador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((contract) => (
                      <SlaRow key={contract.id} contract={contract} onLevel={onLevel} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <p className="font-sans text-xs text-muted-foreground">
            Verde: menos del 60% del SLA consumido · Amarillo: entre 60% y 100% · Rojo: SLA superado
            (100% o más). El color lo calcula el servicio de flujo según el tiempo en la etapa
            actual.
          </p>

          <div>
            <BackButton href="/" label="Ir al panel de revisión" />
          </div>
        </>
      )}
    </PageShell>
  );
}

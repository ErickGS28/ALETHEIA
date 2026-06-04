'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aletheia/frontend-commons';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Select } from '../../../components/ui/select';
import { statusMeta } from '../../../lib/contract-meta';
import { useReportContractsQuery } from '../../contract-reports/api/reportsApi';
import { useAuditLog } from '../hooks/useAuditLog';
import { AuditTimeline } from './AuditTimeline';

export function AuditLogPanel() {
  const [contractId, setContractId] = useState(0);

  const {
    data: contracts,
    isLoading: contractsLoading,
    isError: contractsError,
  } = useReportContractsQuery();

  const {
    entries,
    isLoading: entriesLoading,
    isError: entriesError,
    refetch,
  } = useAuditLog(contractId);

  const contractOptions = useMemo(
    () =>
      (contracts ?? []).map((c) => ({
        value: String(c.id),
        label: `${c.folio} · ${c.title}`,
      })),
    [contracts],
  );

  const contract = useMemo(
    () => (contracts ?? []).find((c) => c.id === contractId) ?? null,
    [contracts, contractId],
  );

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle>Bitácora de auditoría</CardTitle>
        <CardDescription>
          Selecciona un contrato para ver su historial completo de acciones (más reciente primero).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <label htmlFor="audit-contract" className="flex max-w-xl flex-col gap-1.5">
          <span className="font-heading text-xs uppercase tracking-widest text-foreground/60">
            Contrato
          </span>
          <Select
            id="audit-contract"
            options={contractOptions}
            placeholder={contractsLoading ? 'Cargando contratos…' : 'Selecciona un contrato…'}
            value={contractId ? String(contractId) : ''}
            disabled={contractsLoading || contractsError}
            onChange={(e) => setContractId(Number(e.target.value) || 0)}
          />
        </label>

        {contractsError && (
          <div className="flex items-center gap-2 rounded-base border-2 border-border bg-destructive/10 p-3 font-sans text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> No se pudieron cargar los contratos.
          </div>
        )}

        {contract && (
          <div className="flex flex-wrap items-center gap-3 rounded-base border-2 border-border bg-secondary-background/40 p-4">
            <span className="font-heading text-lg">{contract.folio}</span>
            <span className="font-sans text-sm text-foreground/70">{contract.title}</span>
            <Badge variant={statusMeta(contract.status).variant}>
              {statusMeta(contract.status).label}
            </Badge>
            <span className="ml-auto font-sans text-xs text-foreground/50">
              {entries.length} {entries.length === 1 ? 'acción' : 'acciones'}
            </span>
          </div>
        )}

        {!contractId ? (
          <div className="rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-foreground/60">
            Selecciona un contrato para consultar su bitácora.
          </div>
        ) : entriesError ? (
          <div className="flex flex-col items-center gap-3 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-foreground/60">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <span>No se pudo cargar la bitácora.</span>
            <Button variant="neutral" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : entriesLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 font-sans text-sm text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando bitácora…
          </div>
        ) : (
          <AuditTimeline entries={entries} />
        )}
      </CardContent>
    </Card>
  );
}

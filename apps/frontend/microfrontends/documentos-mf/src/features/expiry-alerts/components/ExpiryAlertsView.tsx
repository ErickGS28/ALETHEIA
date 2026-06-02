'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aletheia/frontend-commons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useListDocumentsQuery } from '../../../api/documentsApi';
import { AlertIcon, ClockIcon } from '../../../components/ui/icons';
import { Select } from '../../../components/ui/select';
import { PROVIDER_TYPE_LABELS, adaptDocument } from '../../../lib/adapter';
import type { ContractOption } from '../../../lib/adapter';
import {
  EXPIRY_BADGE_VARIANT,
  EXPIRY_STATUS_LABELS,
  daysBetween,
  getExpiryStatus,
  nowIso,
} from '../../../lib/expiry';
import { formatDate } from '../../../lib/format';
import type { DocumentRecord, ExpiryStatus } from '../../../lib/types';
import { useContractOptions } from '../../../lib/useContractOptions';

type StatusFilter = ExpiryStatus | 'TODOS';

const FILTER_LABELS: Record<StatusFilter, string> = {
  TODOS: 'Todos',
  VENCIDO: 'Vencidos',
  PROXIMO: 'Próximos a vencer',
  VIGENTE: 'Vigentes',
  SIN_VIGENCIA: 'Sin vigencia',
};

const TODAY = nowIso();

function remainingLabel(status: ExpiryStatus, expiryDate?: string): string {
  if (!expiryDate || status === 'SIN_VIGENCIA') return '—';
  const days = daysBetween(TODAY, expiryDate);
  if (status === 'VENCIDO') return `Hace ${Math.abs(days)} día(s)`;
  return `En ${days} día(s)`;
}

/**
 * Loads one contract's documents and lifts the adapted records to the parent.
 * One instance is mounted per contract so we can aggregate across all of them
 * (the gateway only exposes documents per contract).
 */
function ContractDocsFetcher({
  contract,
  onLoaded,
}: {
  contract: ContractOption;
  onLoaded: (contractId: number, docs: Row[]) => void;
}) {
  const { data } = useListDocumentsQuery(contract.id);
  const folio = contract.label.split(' · ')[0];

  useEffect(() => {
    if (!data) return;
    const rows: Row[] = data.map((d) => ({
      ...adaptDocument(d, contract.providerType),
      // Stash the folio for display in the contract column.
      contractFolio: folio,
    }));
    onLoaded(contract.id, rows);
  }, [data, contract.id, contract.providerType, folio, onLoaded]);

  return null;
}

type Row = DocumentRecord & { contractFolio?: string };

export function ExpiryAlertsView() {
  const { options, isLoading, isError, refetch } = useContractOptions();
  const [filter, setFilter] = useState<StatusFilter>('TODOS');
  const [docsByContract, setDocsByContract] = useState<Record<number, Row[]>>({});

  const onLoaded = useCallback((contractId: number, docs: Row[]) => {
    setDocsByContract((prev) => {
      if (prev[contractId] === docs) return prev;
      return { ...prev, [contractId]: docs };
    });
  }, []);

  const allDocs = useMemo(() => Object.values(docsByContract).flat(), [docsByContract]);

  const rows = useMemo(
    () =>
      allDocs
        .map((d) => ({ doc: d, status: getExpiryStatus(d.expiryDate, TODAY) }))
        .sort((a, b) => {
          const order: ExpiryStatus[] = ['VENCIDO', 'PROXIMO', 'VIGENTE', 'SIN_VIGENCIA'];
          return order.indexOf(a.status) - order.indexOf(b.status);
        }),
    [allDocs],
  );

  const counts = useMemo(() => {
    const acc: Record<ExpiryStatus, number> = {
      VENCIDO: 0,
      PROXIMO: 0,
      VIGENTE: 0,
      SIN_VIGENCIA: 0,
    };
    for (const r of rows) acc[r.status] += 1;
    return acc;
  }, [rows]);

  const filtered = filter === 'TODOS' ? rows : rows.filter((r) => r.status === filter);

  const ready = !isLoading;

  return (
    <div className="space-y-6">
      {/* Hidden fetchers: one query per contract, results aggregated above. */}
      {options.map((c) => (
        <ContractDocsFetcher key={c.id} contract={c} onLoaded={onLoaded} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Control de vigencia</CardTitle>
          <CardDescription>
            Estado de vigencia calculado contra la fecha actual ({formatDate(TODAY)}). Próximo a
            vencer = dentro de 30 días.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-base border-2 border-border bg-background p-3 shadow-shadow">
              <div className="flex items-center gap-2 font-mono text-xs text-foreground/60">
                <AlertIcon className="h-4 w-4" />
                Vencidos
              </div>
              <div className="mt-1 font-heading text-2xl">{counts.VENCIDO}</div>
            </div>
            <div className="rounded-base border-2 border-border bg-background p-3 shadow-shadow">
              <div className="flex items-center gap-2 font-mono text-xs text-foreground/60">
                <ClockIcon className="h-4 w-4" />
                Próximos
              </div>
              <div className="mt-1 font-heading text-2xl">{counts.PROXIMO}</div>
            </div>
            <div className="rounded-base border-2 border-border bg-background p-3 shadow-shadow">
              <div className="font-mono text-xs text-foreground/60">Vigentes</div>
              <div className="mt-1 font-heading text-2xl">{counts.VIGENTE}</div>
            </div>
            <div className="rounded-base border-2 border-border bg-background p-3 shadow-shadow">
              <div className="font-mono text-xs text-foreground/60">Sin vigencia</div>
              <div className="mt-1 font-heading text-2xl">{counts.SIN_VIGENCIA}</div>
            </div>
          </div>

          <div className="max-w-xs space-y-1.5">
            <label
              htmlFor="expiry-filter"
              className="font-mono text-xs uppercase tracking-wide text-foreground/60"
            >
              Filtrar por estado
            </label>
            <Select
              id="expiry-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
            >
              {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((f) => (
                <option key={f} value={f}>
                  {FILTER_LABELS[f]}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isError ? (
            <div className="flex flex-col items-center gap-3 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-mono text-sm text-foreground/60">
              <AlertIcon className="h-6 w-6 text-red-700" />
              <span>No se pudieron cargar los contratos.</span>
              <Button variant="neutral" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : !ready ? (
            <p className="font-mono text-sm text-foreground/50">Cargando documentos…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center font-mono text-sm text-foreground/50">
              No hay documentos con este estado de vigencia.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ doc, status }) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-heading">{doc.label}</TableCell>
                    <TableCell>{doc.contractFolio ?? doc.contractId}</TableCell>
                    <TableCell>{PROVIDER_TYPE_LABELS[doc.providerType]}</TableCell>
                    <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                    <TableCell>{remainingLabel(status, doc.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge variant={EXPIRY_BADGE_VARIANT[status]}>
                        {EXPIRY_STATUS_LABELS[status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@aletheia/frontend-commons';
import { FileText, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { adaptContracts } from '../../_shared/api/adapters';
import {
  useCancelContractMutation,
  useListAreasQuery,
  useListContractsQuery,
  useRecoverContractMutation,
  useSubmitContractMutation,
} from '../../_shared/api/contracts-api';
import { CancelContractModal } from '../../_shared/components/CancelContractModal';
import { ErrorBanner } from '../../_shared/components/ErrorBanner';
import { PageHeader } from '../../_shared/components/PageHeader';
import { SlaIndicator } from '../../_shared/components/SlaIndicator';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import {
  type Contract,
  type ContractStatus,
  PROVIDER_TYPE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
} from '../../_shared/domain/contract';
import { getErrorMessage } from '../../_shared/lib/error';
import { useContractFilters } from '../hooks/useContractFilters';
import { ContractRowActions } from './ContractRowActions';

export function ContractListView() {
  const router = useRouter();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useListContractsQuery(undefined);
  const { data: areas } = useListAreasQuery();

  const [submitContract] = useSubmitContractMutation();
  const [cancelContract] = useCancelContractMutation();
  const [recoverContract] = useRecoverContractMutation();

  const contracts = React.useMemo<Contract[]>(() => (data ? adaptContracts(data) : []), [data]);

  const { filters, update, reset, rows, viewAll, viewAreaOnly, noAccess } =
    useContractFilters(contracts);

  const [cancelTarget, setCancelTarget] = React.useState<Contract | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const goDetail = (c: Contract) => router.push(`/${c.id}`);

  const handleSubmit = async (c: Contract) => {
    setActionError(null);
    try {
      await submitContract(c.numericId).unwrap();
      toast.success('Solicitud enviada a revisión', `${c.folio} pasó a revisión.`);
    } catch (error) {
      const message = getErrorMessage(
        error,
        `No se pudo enviar a revisión la solicitud ${c.folio}.`,
      );
      setActionError(message);
      toast.error('No se pudo enviar', message);
    }
  };

  const handleRecover = async (c: Contract) => {
    setActionError(null);
    try {
      await recoverContract(c.numericId).unwrap();
      toast.success('Solicitud recuperada', `${c.folio} volvió a Borrador.`);
    } catch (error) {
      const message = getErrorMessage(error, `No se pudo recuperar la solicitud ${c.folio}.`);
      setActionError(message);
      toast.error('No se pudo recuperar', message);
    }
  };

  const handleCancel = async (target: Contract, reason: string) => {
    setActionError(null);
    try {
      await cancelContract({ id: target.numericId, reason }).unwrap();
      setCancelTarget(null);
      toast.success('Solicitud cancelada', `${target.folio} se canceló correctamente.`);
    } catch (error) {
      const message = getErrorMessage(error, `No se pudo cancelar la solicitud ${target.folio}.`);
      setActionError(message);
      toast.error('No se pudo cancelar', message);
    }
  };

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Solicitudes"
          subtitle="Gestión de solicitudes y contratos (CLM)"
          actions={
            <CookiePrivilegeGuard privilege="CONTRACT_CREATE">
              <Button size="sm" onClick={() => router.push('/crear')}>
                <Plus className="h-4 w-4" /> Nueva solicitud
              </Button>
            </CookiePrivilegeGuard>
          }
        />

        {viewAreaOnly && (
          <div className="rounded-base border-2 border-border bg-secondary-background px-4 py-2 font-sans text-xs text-foreground/70">
            Vista limitada a los contratos de tu área.
          </div>
        )}

        {/* Backend errors (403/400) from row actions */}
        {actionError && (
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Listado de contratos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label className="mb-1 block font-heading text-xs tracking-widest uppercase text-foreground/70">
                  Buscar
                </label>
                <Input
                  placeholder="Folio, título o proveedor…"
                  value={filters.search}
                  onChange={(e) => update({ search: e.target.value })}
                />
              </div>

              <div className="w-44">
                <label className="mb-1 block font-heading text-xs tracking-widest uppercase text-foreground/70">
                  Estado
                </label>
                <Select
                  value={filters.status}
                  onChange={(e) => update({ status: e.target.value as ContractStatus | 'ALL' })}
                >
                  <option value="ALL">Todos</option>
                  {STATUS_ORDER.concat(['CANCELLED', 'REJECTED']).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s as ContractStatus]}
                    </option>
                  ))}
                </Select>
              </div>

              {viewAll && (
                <div className="w-44">
                  <label className="mb-1 block font-heading text-xs tracking-widest uppercase text-foreground/70">
                    Área
                  </label>
                  <Select value={filters.area} onChange={(e) => update({ area: e.target.value })}>
                    <option value="ALL">Todas</option>
                    {(areas ?? []).map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Button variant="neutral" size="sm" onClick={reset}>
                Limpiar
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-base border-2 border-border">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 p-0">
                        <LoadingState message="Cargando contratos…" />
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 p-0">
                        <ErrorState
                          message="No se pudieron cargar los contratos."
                          onRetry={() => refetch()}
                        />
                      </TableCell>
                    </TableRow>
                  ) : noAccess ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 p-0">
                        <EmptyState
                          icon={<FileText className="h-5 w-5 text-muted-foreground" />}
                          title="Sin acceso"
                          description="No tienes privilegios para ver contratos."
                        />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 p-0">
                        <EmptyState
                          icon={<FileText className="h-5 w-5 text-muted-foreground" />}
                          title="Sin resultados"
                          description="Ajusta los filtros o crea una nueva solicitud."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(({ contract, sla }) => (
                      <TableRow
                        key={contract.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver solicitud ${contract.folio}: ${contract.title}`}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                        onClick={() => goDetail(contract)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goDetail(contract);
                          }
                        }}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {contract.folio}
                        </TableCell>
                        <TableCell className="font-base">{contract.title}</TableCell>
                        <TableCell>
                          <span className="block">{contract.providerName}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {PROVIDER_TYPE_LABEL[contract.providerType]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{contract.area}</TableCell>
                        <TableCell>
                          <StatusBadge status={contract.status} />
                        </TableCell>
                        <TableCell>
                          <SlaIndicator level={sla} />
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <ContractRowActions
                            contract={contract}
                            onView={goDetail}
                            onEdit={(c) => router.push(`/crear?id=${c.id}`)}
                            onSubmit={handleSubmit}
                            onCancel={(c) => {
                              setActionError(null);
                              setCancelTarget(c);
                            }}
                            onRecover={handleRecover}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="font-sans text-xs text-muted-foreground">{rows.length} contrato(s)</p>
          </CardContent>
        </Card>
      </div>

      <CancelContractModal
        contract={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          if (cancelTarget) handleCancel(cancelTarget, reason);
        }}
      />
    </main>
  );
}

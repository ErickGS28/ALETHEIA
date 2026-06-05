'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  useToast,
} from '@aletheia/frontend-commons';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { exportContractsCsv } from '../../export/exportReport';
import { useReports } from '../hooks/useReports';
import { ContractsTable } from './ContractsTable';
import { ReportFiltersBar } from './ReportFiltersBar';
import { ReportKpis } from './ReportKpis';

export function ContractReportsPanel() {
  const {
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    contracts,
    total,
    kpis,
    areaOptions,
    isLoading,
    isError,
    refetch,
  } = useReports();

  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportContractsCsv();
      toast.success('Reporte exportado', 'El archivo CSV se descargó correctamente.');
    } catch {
      const message = 'No se pudo exportar el CSV. Inténtalo de nuevo.';
      setExportError(message);
      toast.error('Error al exportar', message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ReportKpis total={total} kpis={kpis} isLoading={isLoading} />

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Reporte de contratos</CardTitle>
            <CardDescription>
              Filtra por estado, área y tipo de proveedor. Exporta el reporte completo a CSV.
            </CardDescription>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />} Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {exportError && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-center gap-2 rounded-base border-2 border-border bg-destructive/10 p-3 font-sans text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4" /> {exportError}
            </div>
          )}

          <ReportFiltersBar
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            areaOptions={areaOptions}
            onChange={setFilter}
            onReset={resetFilters}
          />

          {isError ? (
            <ErrorState message="No se pudieron cargar los reportes." onRetry={() => refetch()} />
          ) : isLoading ? (
            <LoadingState message="Cargando reportes…" />
          ) : (
            <ContractsTable contracts={contracts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

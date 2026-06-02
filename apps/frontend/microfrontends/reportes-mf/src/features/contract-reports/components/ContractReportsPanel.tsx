'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportContractsCsv();
    } catch {
      setExportError('No se pudo exportar el CSV. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ReportKpis total={total} kpis={kpis} />

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
            <div className="flex items-center gap-2 rounded-base border-2 border-border bg-destructive/10 p-3 font-mono text-sm text-destructive">
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
            <div className="flex flex-col items-center gap-3 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-mono text-sm text-foreground/60">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <span>No se pudieron cargar los reportes.</span>
              <Button variant="neutral" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 font-mono text-sm text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando reportes…
            </div>
          ) : (
            <ContractsTable contracts={contracts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Card, CardContent, Skeleton } from '@aletheia/frontend-commons';
import type { StatusKpi } from '../hooks/useReports';

interface ReportKpisProps {
  total: number;
  kpis: StatusKpi[];
  /** Muestra skeletons con la forma de las tarjetas mientras se cargan los datos. */
  isLoading?: boolean;
}

/** Claves estáticas para las tarjetas placeholder (Total + estados frecuentes). */
const SKELETON_KEYS = ['kpi-skel-1', 'kpi-skel-2', 'kpi-skel-3', 'kpi-skel-4'] as const;

export function ReportKpis({ total, kpis, isLoading = false }: ReportKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {SKELETON_KEYS.map((key) => (
          <Card key={key}>
            <CardContent className="p-4">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {/* La tarjeta "Total" comparte la misma estructura que el resto; solo se diferencia
          por el acento `bg-main` de forma intencional, por ser la métrica principal. */}
      <Card className="bg-main text-main-foreground">
        <CardContent className="p-4">
          <div className="font-heading text-4xl leading-none">{total}</div>
          <div className="mt-1 font-sans text-xs uppercase tracking-wider opacity-90">Total</div>
        </CardContent>
      </Card>

      {kpis.map((kpi) => (
        <Card key={kpi.status}>
          <CardContent className="p-4">
            <div className="font-heading text-4xl leading-none">{kpi.count}</div>
            <div className="mt-1 font-sans text-xs uppercase tracking-wider text-muted-foreground">
              {kpi.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

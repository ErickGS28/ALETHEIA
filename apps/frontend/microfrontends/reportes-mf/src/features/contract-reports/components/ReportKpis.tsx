'use client';

import { Card, CardContent } from '@aletheia/frontend-commons';
import type { StatusKpi } from '../hooks/useReports';

interface ReportKpisProps {
  total: number;
  kpis: StatusKpi[];
}

export function ReportKpis({ total, kpis }: ReportKpisProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
            <div className="mt-1 font-sans text-xs uppercase tracking-wider text-foreground/60">
              {kpi.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

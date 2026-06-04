'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useRole,
} from '@aletheia/frontend-commons';
import { FileBarChart, History, Lock } from 'lucide-react';
import { useState } from 'react';
import { type TabItem, Tabs } from '../../../components/ui/tabs';
import { AuditLogPanel } from '../../audit-log/components/AuditLogPanel';
import { ContractReportsPanel } from '../../contract-reports/components/ContractReportsPanel';

const TABS: TabItem[] = [
  { id: 'reports', label: 'Reporte de contratos', icon: <FileBarChart /> },
  { id: 'audit', label: 'Bitácora de auditoría', icon: <History /> },
];

/** Shown when the active role lacks REPORTS_VIEW (gates the whole MF). */
function NoPermission({ role }: { role: string | null }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" /> Sin permiso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 font-sans text-sm text-foreground/70">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <span>Tu rol actual</span>
          <Badge variant="secondary">{role ?? 'sin sesión'}</Badge>
          <span>
            no cuenta con el privilegio <span className="font-heading">REPORTS_VIEW</span> necesario
            para consultar los reportes y la bitácora de auditoría.
          </span>
        </div>
        <p className="text-foreground/50">
          Contacta a un Administrador si necesitas acceso a este módulo.
        </p>
      </CardContent>
    </Card>
  );
}

export function ReportesView() {
  const { role, can } = useRole();
  const [activeTab, setActiveTab] = useState<string>('reports');

  const allowed = can('REPORTS_VIEW');

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading">Reportes</h1>
            <p className="mt-1 font-sans text-sm text-foreground/60">
              Reportes de contratos e historial de auditoría
            </p>
          </div>
          <a href="/">
            <Button variant="outline" size="sm">
              &larr; Inicio
            </Button>
          </a>
        </header>

        {!allowed ? (
          <NoPermission role={role} />
        ) : (
          <>
            <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
            {activeTab === 'reports' ? <ContractReportsPanel /> : <AuditLogPanel />}
          </>
        )}
      </div>
    </main>
  );
}

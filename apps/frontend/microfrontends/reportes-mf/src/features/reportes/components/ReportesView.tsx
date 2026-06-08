'use client';

import { NoPermission, useRole } from '@aletheia/frontend-commons';
import { FileBarChart, History } from 'lucide-react';
import { useState } from 'react';
import { type TabItem, Tabs } from '../../../components/ui/tabs';
import { AuditLogPanel } from '../../audit-log/components/AuditLogPanel';
import { ContractReportsPanel } from '../../contract-reports/components/ContractReportsPanel';

const TABS: TabItem[] = [
  { id: 'reports', label: 'Reporte de contratos', icon: <FileBarChart /> },
  { id: 'audit', label: 'Bitácora de auditoría', icon: <History /> },
];

export function ReportesView() {
  const { role, can } = useRole();
  const [activeTab, setActiveTab] = useState<string>('reports');

  const allowed = can('REPORTS_VIEW');

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-4xl font-heading">Reportes</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Reportes de contratos e historial de auditoría
          </p>
        </header>

        {!allowed ? (
          <NoPermission
            message={`Tu rol actual (${role ?? 'sin sesión'}) no cuenta con el privilegio REPORTS_VIEW necesario para consultar los reportes y la bitácora de auditoría. Contacta a un Administrador si necesitas acceso a este módulo.`}
          />
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

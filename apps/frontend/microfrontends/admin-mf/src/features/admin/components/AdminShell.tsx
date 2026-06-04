'use client';

import { Badge, Button, type Privilege, cn, useRole } from '@aletheia/frontend-commons';
import { Building2, Scale, Users, Workflow } from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { NoPermission } from '../../../components/ui/states';
import { ApoderadosSection } from '../../apoderados/components/ApoderadosSection';
import { AreasSection } from '../../areas/components/AreasSection';
import { UsersSection } from '../../users/components/UsersSection';
import { WorkflowConfigSection } from '../../workflow-config/components/WorkflowConfigSection';

interface AdminTab {
  id: string;
  label: string;
  privilege: Privilege;
  icon: ComponentType<{ className?: string }>;
  Section: ComponentType;
}

const TABS: AdminTab[] = [
  { id: 'users', label: 'Usuarios', privilege: 'USERS_MANAGE', icon: Users, Section: UsersSection },
  {
    id: 'areas',
    label: 'Áreas',
    privilege: 'AREAS_MANAGE',
    icon: Building2,
    Section: AreasSection,
  },
  {
    id: 'apoderados',
    label: 'Apoderados',
    privilege: 'APODERADOS_MANAGE',
    icon: Scale,
    Section: ApoderadosSection,
  },
  {
    id: 'workflow',
    label: 'Flujo',
    privilege: 'WORKFLOW_CONFIG',
    icon: Workflow,
    Section: WorkflowConfigSection,
  },
];

export function AdminShell() {
  const { role, privileges, can } = useRole();
  const [activeId, setActiveId] = useState<string>(TABS[0].id);

  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];
  const ActiveSection = active.Section;
  const allowed = can(active.privilege);

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-heading">Administración</h1>
            <p className="font-sans text-sm text-foreground/60">
              Configuración del sistema CLM (HU-20 a HU-23).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-sans text-sm text-foreground/70">
              <span>Rol:</span>
              <Badge variant="default">{role ?? 'sin sesión'}</Badge>
              <span className="text-foreground/40">·</span>
              <span className="text-foreground/50">{privileges.length} privilegios</span>
            </span>
            <a href="/">
              <Button variant="outline" size="sm">
                &larr; Inicio
              </Button>
            </a>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Secciones de administración">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeId;
            const tabAllowed = can(tab.privilege);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-base border-2 border-border px-4 py-2 text-sm font-heading uppercase tracking-wide shadow-shadow transition-all',
                  'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
                  isActive ? 'bg-main text-main-foreground' : 'bg-background text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {!tabAllowed ? (
                  <Badge variant="neutral" className="ml-1 normal-case">
                    sin permiso
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </nav>

        <section>{allowed ? <ActiveSection /> : <NoPermission />}</section>
      </div>
    </main>
  );
}

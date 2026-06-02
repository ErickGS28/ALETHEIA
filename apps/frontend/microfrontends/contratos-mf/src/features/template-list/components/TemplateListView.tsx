'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useRole,
} from '@aletheia/frontend-commons';
import { Pencil, Plus, Power, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { NoAccess } from '../../../components/ui/no-access';
import { PageHeader } from '../../../components/ui/page-header';
import { Select } from '../../../components/ui/select';
import { SOCIETIES, societyName } from '../../_mock/societies';
import type { Template } from '../../_mock/templates';
import { useTemplates } from '../../_mock/useTemplates';

function TemplateTableRow({
  template,
  onToggle,
}: {
  template: Template;
  onToggle: (id: string) => void;
}) {
  const { id, name, societyId, active } = template;
  return (
    <TableRow>
      <TableCell className="font-base">{name}</TableCell>
      <TableCell>
        {societyId ? (
          <span className="font-mono text-sm">{societyName(societyId)}</span>
        ) : (
          <Badge variant="outline">General</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Activa' : 'Inactiva'}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Link href={`/plantillas/${id}`}>
            <Button variant="neutral" size="sm" aria-label={`Editar ${name}`}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
          <Button
            variant={active ? 'outline' : 'default'}
            size="sm"
            onClick={() => onToggle(id)}
            aria-label={active ? `Desactivar ${name}` : `Activar ${name}`}
          >
            {active ? (
              <>
                <PowerOff className="h-4 w-4" /> Desactivar
              </>
            ) : (
              <>
                <Power className="h-4 w-4" /> Activar
              </>
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="h-24 text-center font-mono text-foreground/40">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function TemplateListView() {
  const { can } = useRole();
  const { templates, ready, toggleActive } = useTemplates();
  const [societyFilter, setSocietyFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    if (societyFilter === 'ALL') return templates;
    if (societyFilter === 'GENERAL') return templates.filter((t) => t.societyId === null);
    return templates.filter((t) => t.societyId === societyFilter);
  }, [templates, societyFilter]);

  if (!can('TEMPLATES_MANAGE')) return <NoAccess />;

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Plantillas"
          actions={
            <Link href="/plantillas/nueva">
              <Button>
                <Plus className="h-4 w-4" /> Nueva plantilla
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-4 border-b-2 border-border px-4 py-3">
              <span className="font-mono text-xs text-foreground/50 uppercase tracking-widest">
                Filtrar por sociedad
              </span>
              <Select
                value={societyFilter}
                onChange={(e) => setSocietyFilter(e.target.value)}
                className="w-56"
              >
                <option value="ALL">Todas</option>
                <option value="GENERAL">General</option>
                {SOCIETIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <span className="ml-auto font-mono text-xs text-foreground/40">
                {filtered.length} plantilla(s)
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sociedad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ready ? (
                  <EmptyRow message="Cargando plantillas…" />
                ) : filtered.length === 0 ? (
                  <EmptyRow message="No hay plantillas para este filtro." />
                ) : (
                  filtered.map((tpl) => (
                    <TemplateTableRow key={tpl.id} template={tpl} onToggle={toggleActive} />
                  ))
                )}
              </TableBody>
            </Table>

            <div className="border-t-2 border-border px-4 py-2">
              <span className="font-mono text-xs text-foreground/40">
                Las plantillas no se eliminan; solo se activan o desactivan (HU-18).
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

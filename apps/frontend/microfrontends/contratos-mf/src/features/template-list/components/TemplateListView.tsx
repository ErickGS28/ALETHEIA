'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useRole,
  useToast,
} from '@aletheia/frontend-commons';
import { Pencil, Plus, Power, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { NoAccess } from '../../../components/ui/no-access';
import { useListTemplatesQuery, useUpdateTemplateMutation } from '../../api/templatesApi';
import { type Template, toUiTemplate } from '../../templates/types';

function TemplateTableRow({
  template,
  onToggle,
  toggling,
}: {
  template: Template;
  onToggle: (template: Template) => void;
  toggling: boolean;
}) {
  const { id, name, active } = template;
  return (
    <TableRow>
      <TableCell className="font-base">{name}</TableCell>
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
            onClick={() => onToggle(template)}
            disabled={toggling}
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
      <TableCell colSpan={3} className="h-24 text-center font-sans text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function TemplateListView() {
  const { can } = useRole();
  const canManage = can('TEMPLATES_MANAGE');
  const toast = useToast();
  const { data, isLoading, isError } = useListTemplatesQuery(undefined, { skip: !canManage });
  const [updateTemplate, { isLoading: isToggling }] = useUpdateTemplateMutation();
  const [search, setSearch] = useState('');
  const [toggleError, setToggleError] = useState<string | null>(null);

  const templates = useMemo<Template[]>(() => (data ?? []).map(toUiTemplate), [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(term));
  }, [templates, search]);

  const handleToggle = async (template: Template) => {
    setToggleError(null);
    const next = !template.active;
    try {
      await updateTemplate({
        id: Number(template.id),
        body: { isActive: next },
      }).unwrap();
      toast.success(
        next ? 'Plantilla activada' : 'Plantilla desactivada',
        `«${template.name}» ${next ? 'ya está disponible' : 'dejó de estar disponible'} para elaborar documentos.`,
      );
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        'No se pudo cambiar el estado de la plantilla. Intenta de nuevo.';
      setToggleError(message);
      toast.error('No se pudo cambiar el estado', message);
    }
  };

  if (!canManage) return <NoAccess />;

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Plantillas"
          backToHome
          backLabel="Inicio"
          actions={
            <Link href="/plantillas/nueva">
              <Button>
                <Plus className="h-4 w-4" /> Nueva plantilla
              </Button>
            </Link>
          }
        />

        {toggleError ? (
          <p className="font-sans text-xs text-destructive" role="alert">
            {toggleError}
          </p>
        ) : null}

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b-2 border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="font-sans text-xs text-muted-foreground uppercase tracking-widest">
                Buscar por nombre
              </span>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre de la plantilla…"
                aria-label="Buscar plantillas por nombre"
                className="w-full sm:w-72"
              />
              <span className="font-sans text-xs text-muted-foreground sm:ml-auto">
                {filtered.length} plantilla(s)
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <EmptyRow message="Cargando plantillas…" />
                ) : isError ? (
                  <EmptyRow message="No se pudieron cargar las plantillas." />
                ) : filtered.length === 0 ? (
                  <EmptyRow message="No hay plantillas que coincidan con la búsqueda." />
                ) : (
                  filtered.map((tpl) => (
                    <TemplateTableRow
                      key={tpl.id}
                      template={tpl}
                      onToggle={handleToggle}
                      toggling={isToggling}
                    />
                  ))
                )}
              </TableBody>
            </Table>

            <div className="border-t-2 border-border px-4 py-2">
              <span className="font-sans text-xs text-muted-foreground">
                Las plantillas no se eliminan; solo se activan o desactivan (HU-18).
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

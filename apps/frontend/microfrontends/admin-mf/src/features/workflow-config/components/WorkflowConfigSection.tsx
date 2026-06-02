'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ROLES,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aletheia/frontend-commons';
import { ArrowDown, ArrowUp, Clock, Pencil, Plus, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/states';
import {
  type WorkflowStage,
  useCreateStageMutation,
  useListStagesQuery,
  useUpdateStageMutation,
} from '../../admin/admin.api';
import { apiErrorMessage } from '../../admin/error';
import { StageFormModal, type StageFormValues } from './StageFormModal';

const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

export function WorkflowConfigSection() {
  const { data: rawStages = [], isLoading, isError, refetch } = useListStagesQuery();
  const [createStage, createState] = useCreateStageMutation();
  const [updateStage, updateState] = useUpdateStageMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowStage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stages = useMemo(() => [...rawStages].sort((a, b) => a.order - b.order), [rawStages]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (stage: WorkflowStage) => {
    setEditing(stage);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: StageFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateStage({ id: editing.id, body: values }).unwrap();
      } else {
        await createStage(values).unwrap();
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'No se pudo guardar la etapa.'));
    }
  };

  // Reordena intercambiando el `order` con la etapa adyacente (dos PATCH).
  const move = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= stages.length) return;
    const a = stages[index];
    const b = stages[target];
    setActionError(null);
    try {
      await Promise.all([
        updateStage({ id: a.id, body: { order: b.order } }).unwrap(),
        updateStage({ id: b.id, body: { order: a.order } }).unwrap(),
      ]);
    } catch (err) {
      setActionError(apiErrorMessage(err, 'No se pudo reordenar la etapa.'));
    }
  };

  const totalSla = stages.reduce((sum, s) => sum + s.slaHours, 0);
  const nextOrder = stages.reduce((max, s) => Math.max(max, s.order), 0) + 1;
  const reordering = updateState.isLoading;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Configuración del flujo</CardTitle>
          <CardDescription>
            Etapas del workflow, su rol responsable y SLA. SLA total: {totalSla} h.
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Nueva etapa
        </Button>
      </CardHeader>
      <CardContent>
        {actionError ? (
          <Badge variant="destructive" className="mb-4 block w-full py-2 text-center normal-case">
            {actionError}
          </Badge>
        ) : null}
        {isLoading ? (
          <LoadingState message="Cargando etapas…" />
        ) : isError ? (
          <ErrorState message="No se pudieron cargar las etapas." onRetry={() => refetch()} />
        ) : stages.length === 0 ? (
          <EmptyState
            icon={<Workflow className="h-5 w-5" />}
            title="Sin etapas"
            description="Define la primera etapa del flujo."
            action={
              <Button onClick={openCreate} size="sm">
                <Plus /> Nueva etapa
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Orden</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Badge variant="neutral">{s.order}</Badge>
                  </TableCell>
                  <TableCell className="font-base">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabel(s.roleRequired)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-foreground/70">
                      <Clock className="h-3.5 w-3.5" /> {s.slaHours} h
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center justify-end gap-1">
                      <Button
                        variant="neutral"
                        size="icon"
                        disabled={i === 0 || reordering}
                        onClick={() => move(i, 'up')}
                        aria-label="Subir etapa"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="neutral"
                        size="icon"
                        disabled={i === stages.length - 1 || reordering}
                        onClick={() => move(i, 'down')}
                        aria-label="Bajar etapa"
                      >
                        <ArrowDown />
                      </Button>
                      <Button variant="neutral" size="sm" onClick={() => openEdit(s)}>
                        <Pencil /> Editar
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <StageFormModal
        open={modalOpen}
        initial={editing}
        nextOrder={nextOrder}
        submitting={createState.isLoading || updateState.isLoading}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}

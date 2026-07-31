'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@aletheia/frontend-commons';
import { Building2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '../../../components/ui/switch';
import {
  type Area,
  useCreateAreaMutation,
  useListAreasQuery,
  useUpdateAreaMutation,
} from '../../admin/admin.api';
import { apiErrorMessage } from '../../admin/error';
import { AreaFormModal, type AreaFormValues } from './AreaFormModal';

export function AreasSection() {
  const toast = useToast();
  const { data: areas = [], isLoading, isError, refetch } = useListAreasQuery();
  const [createArea, createState] = useCreateAreaMutation();
  const [updateArea, updateState] = useUpdateAreaMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (area: Area) => {
    setEditing(area);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: AreaFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateArea({ id: editing.id, body: values }).unwrap();
      } else {
        await createArea({ name: values.name }).unwrap();
      }
      setModalOpen(false);
      toast.success(
        editing ? 'Área actualizada' : 'Área creada',
        editing
          ? 'Los cambios del área se guardaron correctamente.'
          : 'La nueva área se registró correctamente.',
      );
    } catch (err) {
      const message = apiErrorMessage(err, 'No se pudo guardar el área.');
      setFormError(message);
      toast.error('No se pudo guardar el área', message);
    }
  };

  const toggleActive = async (area: Area) => {
    setActionError(null);
    try {
      await updateArea({ id: area.id, body: { isActive: !area.isActive } }).unwrap();
      toast.success(
        area.isActive ? 'Área desactivada' : 'Área activada',
        `"${area.name}" ahora está ${area.isActive ? 'inactiva' : 'activa'}.`,
      );
    } catch (err) {
      const message = apiErrorMessage(err, 'No se pudo cambiar el estado del área.');
      setActionError(message);
      toast.error('No se pudo cambiar el estado', message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Áreas</CardTitle>
          <CardDescription>
            Áreas de la organización ({areas.length}). Un área inactiva no se puede asignar.
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Nueva área
        </Button>
      </CardHeader>
      <CardContent>
        {actionError ? (
          <Badge variant="destructive" className="mb-4 block w-full py-2 text-center normal-case">
            {actionError}
          </Badge>
        ) : null}
        {isLoading ? (
          <LoadingState message="Cargando áreas…" />
        ) : isError ? (
          <ErrorState message="No se pudieron cargar las áreas." onRetry={() => refetch()} />
        ) : areas.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="Sin áreas"
            description="Crea la primera área."
            action={
              <Button onClick={openCreate} size="sm">
                <Plus /> Nueva área
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-base">{a.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={() => toggleActive(a)}
                        aria-label={a.isActive ? 'Desactivar área' : 'Activar área'}
                      />
                      <Badge variant={a.isActive ? 'default' : 'neutral'}>
                        {a.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="neutral" size="sm" onClick={() => openEdit(a)}>
                      <Pencil /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AreaFormModal
        open={modalOpen}
        initial={editing}
        submitting={createState.isLoading || updateState.isLoading}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}

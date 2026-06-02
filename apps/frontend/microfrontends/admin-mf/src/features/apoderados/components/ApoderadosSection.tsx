'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aletheia/frontend-commons';
import { Pencil, Plus, Scale } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/states';
import { Switch } from '../../../components/ui/switch';
import {
  type Apoderado,
  useCreateApoderadoMutation,
  useListApoderadosQuery,
  useUpdateApoderadoMutation,
} from '../../admin/admin.api';
import { apiErrorMessage } from '../../admin/error';
import { ApoderadoFormModal, type ApoderadoFormValues } from './ApoderadoFormModal';

export function ApoderadosSection() {
  const { data: apoderados = [], isLoading, isError, refetch } = useListApoderadosQuery();
  const [createApoderado, createState] = useCreateApoderadoMutation();
  const [updateApoderado, updateState] = useUpdateApoderadoMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Apoderado | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (apoderado: Apoderado) => {
    setEditing(apoderado);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: ApoderadoFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateApoderado({ id: editing.id, body: values }).unwrap();
      } else {
        await createApoderado({ name: values.name, legalPower: values.legalPower }).unwrap();
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'No se pudo guardar el apoderado.'));
    }
  };

  const toggleActive = async (apoderado: Apoderado) => {
    setActionError(null);
    try {
      await updateApoderado({ id: apoderado.id, body: { isActive: !apoderado.isActive } }).unwrap();
    } catch (err) {
      setActionError(apiErrorMessage(err, 'No se pudo cambiar el estado del apoderado.'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Apoderados</CardTitle>
          <CardDescription>
            Apoderados legales y el alcance de su poder ({apoderados.length}).
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Nuevo apoderado
        </Button>
      </CardHeader>
      <CardContent>
        {actionError ? (
          <Badge variant="destructive" className="mb-4 block w-full py-2 text-center normal-case">
            {actionError}
          </Badge>
        ) : null}
        {isLoading ? (
          <LoadingState message="Cargando apoderados…" />
        ) : isError ? (
          <ErrorState message="No se pudieron cargar los apoderados." onRetry={() => refetch()} />
        ) : apoderados.length === 0 ? (
          <EmptyState
            icon={<Scale className="h-5 w-5" />}
            title="Sin apoderados"
            description="Registra el primer apoderado."
            action={
              <Button onClick={openCreate} size="sm">
                <Plus /> Nuevo apoderado
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Poder legal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apoderados.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-base">{a.name}</TableCell>
                  <TableCell className="max-w-md text-foreground/70">{a.legalPower}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={() => toggleActive(a)}
                        aria-label={a.isActive ? 'Desactivar apoderado' : 'Activar apoderado'}
                      />
                      <Badge variant={a.isActive ? 'default' : 'neutral'}>
                        {a.isActive ? 'Activo' : 'Inactivo'}
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

      <ApoderadoFormModal
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

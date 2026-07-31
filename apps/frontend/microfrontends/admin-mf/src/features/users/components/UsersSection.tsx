'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  ROLES,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@aletheia/frontend-commons';
import { Pencil, Plus, Trash2, Users as UsersIcon } from 'lucide-react';
import { useState } from 'react';
import {
  type User,
  useCreateUserMutation,
  useDeleteUserMutation,
  useListAreasQuery,
  useListUsersQuery,
  useUpdateUserMutation,
} from '../../admin/admin.api';
import { apiErrorMessage } from '../../admin/error';
import { UserFormModal, type UserFormValues } from './UserFormModal';

const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

export function UsersSection() {
  const toast = useToast();
  const { data: users = [], isLoading, isError, refetch } = useListUsersQuery();
  const { data: areas = [] } = useListAreasQuery();
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const areaName = (id?: number) =>
    id == null ? '—' : (areas.find((a) => a.id === id)?.name ?? '—');

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: UserFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        // El gateway (UpdateUserDto) NO acepta `email`: omitirlo del PATCH.
        // `areaId` se envía como `null` cuando se elige "Sin área" para limpiarlo.
        await updateUser({
          id: editing.id,
          body: {
            name: values.name,
            lastName: values.lastName,
            roles: values.roles,
            areaId: values.areaId ?? null,
            isActive: values.isActive,
          },
        }).unwrap();
      } else {
        await createUser({
          email: values.email,
          name: values.name,
          lastName: values.lastName,
          password: values.password ?? '',
          roles: values.roles,
          areaId: values.areaId,
        }).unwrap();
      }
      setModalOpen(false);
      toast.success(
        editing ? 'Usuario actualizado' : 'Usuario creado',
        editing
          ? 'Los cambios del usuario se guardaron correctamente.'
          : 'El nuevo usuario se registró correctamente.',
      );
    } catch (err) {
      const message = apiErrorMessage(err, 'No se pudo guardar el usuario.');
      setFormError(message);
      toast.error('No se pudo guardar el usuario', message);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setActionError(null);
    const target = toDelete;
    try {
      await deleteUser(target.id).unwrap();
      setToDelete(null);
      refetch();
      toast.success('Usuario eliminado', `Se eliminó a "${target.name} ${target.lastName}".`);
    } catch (err) {
      setToDelete(null);
      const message = apiErrorMessage(err, 'No se pudo eliminar el usuario.');
      setActionError(message);
      toast.error('No se pudo eliminar el usuario', message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Gestiona usuarios, su área y los roles asignados ({users.length}).
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Nuevo usuario
        </Button>
      </CardHeader>
      <CardContent>
        {actionError ? (
          <Badge variant="destructive" className="mb-4 block w-full py-2 text-center normal-case">
            {actionError}
          </Badge>
        ) : null}
        {isLoading ? (
          <LoadingState message="Cargando usuarios…" />
        ) : isError ? (
          <ErrorState message="No se pudieron cargar los usuarios." onRetry={() => refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-5 w-5" />}
            title="Sin usuarios"
            description="Crea el primer usuario para comenzar."
            action={
              <Button onClick={openCreate} size="sm">
                <Plus /> Nuevo usuario
              </Button>
            }
          />
        ) : (
          <Table className="sm:min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-base">
                    {u.name} {u.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{areaName(u.areaId)}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {roleLabel(r)}
                        </Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'default' : 'neutral'}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Button variant="neutral" size="sm" onClick={() => openEdit(u)}>
                        <Pencil /> Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setToDelete(u)}
                        aria-label="Eliminar usuario"
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <UserFormModal
        open={modalOpen}
        initial={editing}
        areas={areas}
        submitting={createState.isLoading || updateState.isLoading}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar usuario"
        description={
          toDelete ? `Se eliminará a "${toDelete.name} ${toDelete.lastName}".` : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}

'use client';

import { Badge, Button, Checkbox, Input, ROLES, type Role } from '@aletheia/frontend-commons';
import { useEffect, useMemo, useState } from 'react';
import { Label } from '../../../components/ui/label';
import { Modal } from '../../../components/ui/modal';
import { Select } from '../../../components/ui/select';
import type { Area, User } from '../../admin/admin.api';

export interface UserFormValues {
  email: string;
  name: string;
  lastName: string;
  password?: string;
  areaId?: number;
  roles: Role[];
  isActive: boolean;
}

interface UserFormModalProps {
  open: boolean;
  initial?: User | null;
  areas: Area[];
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserFormModal({
  open,
  initial,
  areas,
  submitting,
  error: serverError,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const activeAreas = useMemo(() => areas.filter((a) => a.isActive), [areas]);

  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [areaId, setAreaId] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setLastName(initial?.lastName ?? '');
    setEmail(initial?.email ?? '');
    setPassword('');
    setAreaId(initial?.areaId != null ? String(initial.areaId) : String(activeAreas[0]?.id ?? ''));
    setRoles(initial?.roles ?? []);
    setIsActive(initial?.isActive ?? true);
    setError(null);
  }, [open, initial, activeAreas]);

  const toggleRole = (role: Role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleSubmit = () => {
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (!lastName.trim()) return setError('El apellido es obligatorio.');
    if (!EMAIL_RE.test(email.trim())) return setError('El email no es válido.');
    if (!initial && password.trim().length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (roles.length === 0) return setError('Asigna al menos un rol.');
    onSubmit({
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password: initial ? undefined : password,
      areaId: areaId ? Number(areaId) : undefined,
      roles,
      isActive,
    });
  };

  // El usuario editado puede tener un área que ya está inactiva: la incluimos.
  const selectableAreas = useMemo(() => {
    if (initial?.areaId != null && !activeAreas.some((a) => a.id === initial.areaId)) {
      const own = areas.find((a) => a.id === initial.areaId);
      return own ? [own, ...activeAreas] : activeAreas;
    }
    return activeAreas;
  }, [activeAreas, areas, initial]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar usuario' : 'Nuevo usuario'}
      description={initial ? 'Actualiza los datos del usuario.' : 'Registra un nuevo usuario.'}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Nombre</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-lastname">Apellido</Label>
            <Input
              id="user-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@aletheia.com"
            // El email no se puede modificar en edición (el backend no lo acepta).
            readOnly={Boolean(initial)}
            disabled={Boolean(initial)}
          />
          {initial ? (
            <p className="font-mono text-xs text-foreground/50">El correo no se puede modificar.</p>
          ) : null}
        </div>

        {!initial ? (
          <div className="space-y-1.5">
            <Label htmlFor="user-password">Contraseña</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="user-area">Área</Label>
          {selectableAreas.length === 0 ? (
            <p className="text-sm font-mono text-foreground/60">
              No hay áreas activas. Crea o activa un área primero.
            </p>
          ) : (
            <Select id="user-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">Sin área</option>
              {selectableAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.isActive ? '' : ' (inactiva)'}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <label
                key={r.id}
                htmlFor={`user-role-${r.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-base border-2 border-border bg-background px-3 py-2"
              >
                <Checkbox
                  id={`user-role-${r.id}`}
                  checked={roles.includes(r.id)}
                  onCheckedChange={() => toggleRole(r.id)}
                />
                <span className="flex flex-col">
                  <span className="font-base text-sm">{r.label}</span>
                  <span className="font-mono text-xs text-foreground/50">{r.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {initial ? (
          <div className="flex items-center gap-3">
            <Checkbox
              id="user-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(Boolean(v))}
            />
            <Label htmlFor="user-active" className="cursor-pointer">
              Usuario activo
            </Label>
          </div>
        ) : null}

        {error || serverError ? (
          <Badge variant="destructive" className="block w-full py-2 text-center normal-case">
            {error ?? serverError}
          </Badge>
        ) : null}
      </div>
    </Modal>
  );
}

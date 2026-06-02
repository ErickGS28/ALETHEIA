'use client';

import { Badge, Button, Input, ROLES, type Role } from '@aletheia/frontend-commons';
import { useEffect, useState } from 'react';
import { Label } from '../../../components/ui/label';
import { Modal } from '../../../components/ui/modal';
import { Select } from '../../../components/ui/select';
import type { WorkflowStage } from '../../admin/admin.api';

export interface StageFormValues {
  name: string;
  roleRequired: Role;
  slaHours: number;
  order: number;
}

interface StageFormModalProps {
  open: boolean;
  initial?: WorkflowStage | null;
  nextOrder: number;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: StageFormValues) => void;
}

export function StageFormModal({
  open,
  initial,
  nextOrder,
  submitting,
  error: serverError,
  onClose,
  onSubmit,
}: StageFormModalProps) {
  const [name, setName] = useState('');
  const [roleRequired, setRoleRequired] = useState<Role>(ROLES[0].id);
  const [slaHours, setSlaHours] = useState('24');
  const [order, setOrder] = useState('1');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setRoleRequired(initial?.roleRequired ?? ROLES[0].id);
    setSlaHours(initial ? String(initial.slaHours) : '24');
    setOrder(initial ? String(initial.order) : String(nextOrder));
    setError(null);
  }, [open, initial, nextOrder]);

  const handleSubmit = () => {
    if (!name.trim()) return setError('El nombre de la etapa es obligatorio.');
    const sla = Number(slaHours);
    if (!Number.isFinite(sla) || sla <= 0) return setError('El SLA debe ser un número mayor a 0.');
    const ord = Number(order);
    if (!Number.isFinite(ord) || ord <= 0)
      return setError('El orden debe ser un número mayor a 0.');
    onSubmit({ name: name.trim(), roleRequired, slaHours: sla, order: ord });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar etapa' : 'Nueva etapa'}
      description={initial ? 'Actualiza la etapa del flujo.' : 'Agrega una etapa al flujo.'}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear etapa'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="stage-name">Nombre</Label>
          <Input
            id="stage-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Revisión Abogado"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stage-role">Rol asignado</Label>
          <Select
            id="stage-role"
            value={roleRequired}
            onChange={(e) => setRoleRequired(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="stage-order">Orden</Label>
            <Input
              id="stage-order"
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stage-sla">SLA (horas)</Label>
            <Input
              id="stage-sla"
              type="number"
              min={1}
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              placeholder="24"
            />
          </div>
        </div>

        {error || serverError ? (
          <Badge variant="destructive" className="block w-full py-2 text-center normal-case">
            {error ?? serverError}
          </Badge>
        ) : null}
      </div>
    </Modal>
  );
}

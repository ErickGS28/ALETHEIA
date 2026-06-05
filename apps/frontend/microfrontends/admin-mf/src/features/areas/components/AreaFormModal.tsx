'use client';

import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  Label,
  Modal,
} from '@aletheia/frontend-commons';
import { useEffect, useState } from 'react';
import type { Area } from '../../admin/admin.api';

export interface AreaFormValues {
  name: string;
  isActive: boolean;
}

interface AreaFormModalProps {
  open: boolean;
  initial?: Area | null;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: AreaFormValues) => void;
}

export function AreaFormModal({
  open,
  initial,
  submitting,
  error: serverError,
  onClose,
  onSubmit,
}: AreaFormModalProps) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setIsActive(initial?.isActive ?? true);
    setError(null);
  }, [open, initial]);

  const handleSubmit = () => {
    if (!name.trim()) return setError('El nombre del área es obligatorio.');
    onSubmit({ name: name.trim(), isActive });
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      allowBackdropClose={false}
      title={initial ? 'Editar área' : 'Nueva área'}
      description={initial ? 'Actualiza el área.' : 'Registra una nueva área.'}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !isValid}>
            {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear área'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Nombre" htmlFor="area-name" required>
          <Input
            id="area-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Compras"
          />
        </FormField>

        {initial ? (
          <>
            <div className="flex items-center gap-3">
              <Checkbox
                id="area-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(Boolean(v))}
              />
              <Label htmlFor="area-active" className="cursor-pointer">
                Área activa
              </Label>
            </div>
            <p className="text-xs font-sans text-muted-foreground">
              Un área inactiva no puede asignarse a usuarios nuevos.
            </p>
          </>
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

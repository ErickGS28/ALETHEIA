'use client';

import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  Label,
  Modal,
  Textarea,
} from '@aletheia/frontend-commons';
import { useEffect, useState } from 'react';
import type { Apoderado } from '../../admin/admin.api';

export interface ApoderadoFormValues {
  name: string;
  legalPower: string;
  isActive: boolean;
}

interface ApoderadoFormModalProps {
  open: boolean;
  initial?: Apoderado | null;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ApoderadoFormValues) => void;
}

export function ApoderadoFormModal({
  open,
  initial,
  submitting,
  error: serverError,
  onClose,
  onSubmit,
}: ApoderadoFormModalProps) {
  const [name, setName] = useState('');
  const [legalPower, setLegalPower] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setLegalPower(initial?.legalPower ?? '');
    setIsActive(initial?.isActive ?? true);
    setError(null);
  }, [open, initial]);

  const handleSubmit = () => {
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (!legalPower.trim()) return setError('Describe el poder legal.');
    onSubmit({ name: name.trim(), legalPower: legalPower.trim(), isActive });
  };

  const isValid = name.trim().length > 0 && legalPower.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      allowBackdropClose={false}
      title={initial ? 'Editar apoderado' : 'Nuevo apoderado'}
      description={
        initial ? 'Actualiza los datos del apoderado.' : 'Registra un nuevo apoderado legal.'
      }
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !isValid}>
            {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear apoderado'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Nombre" htmlFor="apo-name" required>
          <Input
            id="apo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
          />
        </FormField>

        <FormField label="Descripción del poder legal" htmlFor="apo-power" required>
          <Textarea
            id="apo-power"
            value={legalPower}
            onChange={(e) => setLegalPower(e.target.value)}
            rows={3}
            placeholder="Ej. Poder general para actos de administración y dominio."
          />
        </FormField>

        {initial ? (
          <div className="flex items-center gap-3">
            <Checkbox
              id="apo-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(Boolean(v))}
            />
            <Label htmlFor="apo-active" className="cursor-pointer">
              Apoderado activo
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

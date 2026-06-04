'use client';

import type { ContractOption } from '../lib/adapter';
import { Select } from './ui/select';

interface ContractSelectorProps {
  value: number | '';
  onChange: (contractId: number) => void;
  options: ContractOption[];
  disabled?: boolean;
  id?: string;
}

/** Shared dropdown to pick the active contract across features. */
export function ContractSelector({
  value,
  onChange,
  options,
  disabled = false,
  id = 'contract',
}: ContractSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="font-sans text-xs uppercase tracking-wide text-foreground/60">
        Contrato
      </label>
      <Select
        id={id}
        value={value === '' ? '' : String(value)}
        disabled={disabled || options.length === 0}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.length === 0 ? (
          <option value="">Sin contratos disponibles</option>
        ) : (
          options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))
        )}
      </Select>
    </div>
  );
}

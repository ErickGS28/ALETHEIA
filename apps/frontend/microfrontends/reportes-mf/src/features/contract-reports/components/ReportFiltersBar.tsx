'use client';

import { Button } from '@aletheia/frontend-commons';
import { X } from 'lucide-react';
import { Select } from '../../../components/ui/select';
import { CONTRACT_STATUSES } from '../../../lib/contract-meta';
import type { AreaOption, ReportFilters } from '../hooks/useReports';

interface ReportFiltersBarProps {
  filters: ReportFilters;
  hasActiveFilters: boolean;
  areaOptions: AreaOption[];
  onChange: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = CONTRACT_STATUSES.map((s) => ({ value: s.id, label: s.label }));
const PROVIDER_OPTIONS = [
  { value: 'FISICA', label: 'Persona física' },
  { value: 'MORAL', label: 'Persona moral' },
];

export function ReportFiltersBar({
  filters,
  hasActiveFilters,
  areaOptions,
  onChange,
  onReset,
}: ReportFiltersBarProps) {
  const areaSelectOptions = areaOptions.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label htmlFor="filter-status" className="flex flex-col gap-1.5">
        <span className="font-heading text-xs uppercase tracking-widest text-foreground/60">
          Estado
        </span>
        <Select
          id="filter-status"
          options={STATUS_OPTIONS}
          placeholder="Todos"
          value={filters.status}
          onChange={(e) => onChange('status', e.target.value as ReportFilters['status'])}
        />
      </label>

      <label htmlFor="filter-area" className="flex flex-col gap-1.5">
        <span className="font-heading text-xs uppercase tracking-widest text-foreground/60">
          Área
        </span>
        <Select
          id="filter-area"
          options={areaSelectOptions}
          placeholder="Todas"
          value={filters.areaId}
          onChange={(e) => onChange('areaId', e.target.value)}
        />
      </label>

      <label htmlFor="filter-provider" className="flex flex-col gap-1.5">
        <span className="font-heading text-xs uppercase tracking-widest text-foreground/60">
          Tipo de proveedor
        </span>
        <Select
          id="filter-provider"
          options={PROVIDER_OPTIONS}
          placeholder="Todos"
          value={filters.providerType}
          onChange={(e) =>
            onChange('providerType', e.target.value as ReportFilters['providerType'])
          }
        />
      </label>

      <div className="flex items-end">
        <Button variant="neutral" className="w-full" onClick={onReset} disabled={!hasActiveFilters}>
          <X /> Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

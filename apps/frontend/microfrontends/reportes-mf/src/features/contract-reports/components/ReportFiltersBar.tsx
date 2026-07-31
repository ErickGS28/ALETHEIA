'use client';

import { Button, Select } from '@aletheia/frontend-commons';
import { X } from 'lucide-react';
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
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
          Estado
        </span>
        <Select
          id="filter-status"
          value={filters.status}
          onChange={(e) => onChange('status', e.target.value as ReportFilters['status'])}
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>

      <label htmlFor="filter-area" className="flex flex-col gap-1.5">
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
          Área
        </span>
        <Select
          id="filter-area"
          value={filters.areaId}
          onChange={(e) => onChange('areaId', e.target.value)}
        >
          <option value="">Todas</option>
          {areaSelectOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>

      <label htmlFor="filter-provider" className="flex flex-col gap-1.5">
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
          Tipo de proveedor
        </span>
        <Select
          id="filter-provider"
          value={filters.providerType}
          onChange={(e) =>
            onChange('providerType', e.target.value as ReportFilters['providerType'])
          }
        >
          <option value="">Todos</option>
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex items-end">
        <Button variant="neutral" className="w-full" onClick={onReset} disabled={!hasActiveFilters}>
          <X /> Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

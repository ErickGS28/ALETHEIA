'use client';

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aletheia/frontend-commons';
import { statusMeta } from '../../../lib/contract-meta';
import { formatDate } from '../../../lib/format';
import type { Contract } from '../api/reportsApi';

interface ContractsTableProps {
  contracts: Contract[];
}

const PROVIDER_LABELS: Record<Contract['providerType'], string> = {
  FISICA: 'Persona física',
  MORAL: 'Persona moral',
};

export function ContractsTable({ contracts }: ContractsTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-foreground/60">
        No hay contratos que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-base border-2 border-border bg-background shadow-shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Folio</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Creado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((c) => {
            const meta = statusMeta(c.status);
            return (
              <TableRow key={c.id}>
                <TableCell className="font-heading">{c.folio}</TableCell>
                <TableCell className="max-w-[16rem] truncate">{c.title}</TableCell>
                <TableCell className="text-foreground/70">{c.vendorName}</TableCell>
                <TableCell>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </TableCell>
                <TableCell>{c.area?.name ?? `Área #${c.areaId}`}</TableCell>
                <TableCell className="text-foreground/70">
                  {PROVIDER_LABELS[c.providerType]}
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground/70">
                  {formatDate(c.createdAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

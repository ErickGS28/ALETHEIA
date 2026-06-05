'use client';

import {
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aletheia/frontend-commons';
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
      <div className="rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-muted-foreground">
        No hay contratos que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-base border-2 border-border bg-background shadow-shadow">
      <Table className="min-w-[640px]">
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
          {contracts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-heading">
                {/* Enlace cross-zone al detalle de la solicitud (recarga completa por diseño). */}
                <a
                  href={`/solicitudes/${c.id}`}
                  className="rounded-base text-main underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  {c.folio}
                </a>
              </TableCell>
              <TableCell className="max-w-[16rem] truncate">{c.title}</TableCell>
              <TableCell className="text-foreground/70">{c.vendorName}</TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell>
                {c.area?.name ?? <span className="text-muted-foreground">(Sin área)</span>}
              </TableCell>
              <TableCell className="text-foreground/70">
                {PROVIDER_LABELS[c.providerType]}
              </TableCell>
              <TableCell className="whitespace-nowrap text-foreground/70">
                {formatDate(c.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

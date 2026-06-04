'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, MoreHorizontal } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

/* ─── Types ─────────────────────────────────────────────────────────── */

type ContractStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED';

type Contract = {
  id: string;
  proveedor: string;
  area: string;
  status: ContractStatus;
  tipo: 'Persona Física' | 'Persona Moral';
  monto: number;
};

/* ─── Data ───────────────────────────────────────────────────────────── */

const contracts: Contract[] = [
  {
    id: 'CLM-2025-0042',
    proveedor: 'TechCorp México S.A.',
    area: 'Compras',
    status: 'ADMIN_REVIEW',
    tipo: 'Persona Moral',
    monto: 150000,
  },
  {
    id: 'CLM-2025-0041',
    proveedor: 'Distribuidora Norte',
    area: 'Logística',
    status: 'SIGNED',
    tipo: 'Persona Moral',
    monto: 85000,
  },
  {
    id: 'CLM-2025-0040',
    proveedor: 'Ana García López',
    area: 'RRHH',
    status: 'DRAFT',
    tipo: 'Persona Física',
    monto: 12000,
  },
  {
    id: 'CLM-2025-0039',
    proveedor: 'Constructora Oeste',
    area: 'Infraestructura',
    status: 'LAWYER_REVIEW',
    tipo: 'Persona Moral',
    monto: 320000,
  },
  {
    id: 'CLM-2025-0038',
    proveedor: 'Carlos Mendoza Ruiz',
    area: 'IT',
    status: 'REJECTED',
    tipo: 'Persona Física',
    monto: 45000,
  },
  {
    id: 'CLM-2025-0037',
    proveedor: 'Servicios Globales SA',
    area: 'Finanzas',
    status: 'SIGNING',
    tipo: 'Persona Moral',
    monto: 220000,
  },
  {
    id: 'CLM-2025-0036',
    proveedor: 'María Torres Hdez.',
    area: 'Legal',
    status: 'APPROVAL_PENDING',
    tipo: 'Persona Física',
    monto: 28000,
  },
];

/* ─── Status badge ───────────────────────────────────────────────────── */

const statusColor: Record<ContractStatus, string> = {
  DRAFT: 'bg-secondary-background text-foreground',
  SUBMITTED: 'bg-main text-main-foreground',
  ADMIN_REVIEW: 'bg-yellow-400 text-black',
  LAWYER_REVIEW: 'bg-orange-400 text-black',
  APPROVAL_PENDING: 'bg-blue-400 text-black',
  SIGNING: 'bg-purple-400 text-black',
  SIGNED: 'bg-green-500 text-white',
  REJECTED: 'bg-red-500 text-white',
};

function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`inline-block border-2 border-border px-2 py-0.5 text-[10px] font-heading tracking-widest rounded-base ${statusColor[status]}`}
    >
      {status}
    </span>
  );
}

/* ─── Columns ────────────────────────────────────────────────────────── */

const columns: ColumnDef<Contract>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: 'ID Contrato',
    cell: ({ row }) => (
      <span className="font-sans text-xs text-foreground/60">{row.getValue('id')}</span>
    ),
  },
  {
    accessorKey: 'proveedor',
    header: ({ column }) => (
      <Button
        variant="noShadow"
        size="sm"
        className="px-0 font-heading text-xs tracking-widest uppercase"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Proveedor <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-base">{row.getValue('proveedor')}</span>,
  },
  {
    accessorKey: 'area',
    header: 'Área',
    cell: ({ row }) => <span className="font-sans text-sm">{row.getValue('area')}</span>,
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => (
      <span className="font-sans text-xs text-foreground/60">{row.getValue('tipo')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'monto',
    header: () => (
      <div className="text-right font-heading text-xs tracking-widest uppercase">Monto</div>
    ),
    cell: ({ row }) => {
      const formatted = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }).format(row.getValue('monto'));
      return <div className="text-right font-sans text-sm">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const contract = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="noShadow" className="h-8 w-8 p-0">
              <span className="sr-only">Acciones</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contract.id)}>
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Ver contrato</DropdownMenuItem>
            <DropdownMenuItem>Ver historial</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Cancelar contrato</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

/* ─── Component ──────────────────────────────────────────────────────── */

export default function ContractDataTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: contracts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 pb-4">
        <Input
          placeholder="Filtrar por proveedor..."
          value={(table.getColumn('proveedor')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('proveedor')?.setFilterValue(e.target.value)}
          className="max-w-xs"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="neutral" size="sm" className="ml-auto">
              Columnas <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border-2 border-border rounded-base overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center font-sans text-foreground/40"
                >
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4">
        <span className="text-xs font-sans text-foreground/40">
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </span>
        <div className="flex gap-2">
          <Button
            variant="neutral"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="neutral"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

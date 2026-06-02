'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useRole,
} from '@aletheia/frontend-commons';
import { Eye, MoreHorizontal, Pencil, RotateCcw, Send, XCircle } from 'lucide-react';
import type { Contract } from '../../_shared/domain/contract';

// Per-row action menu. Each item is gated by privilege AND state.

interface ContractRowActionsProps {
  contract: Contract;
  onView: (c: Contract) => void;
  onEdit: (c: Contract) => void;
  onSubmit: (c: Contract) => void;
  onCancel: (c: Contract) => void;
  onRecover: (c: Contract) => void;
}

export function ContractRowActions({
  contract,
  onView,
  onEdit,
  onSubmit,
  onCancel,
  onRecover,
}: ContractRowActionsProps) {
  const { can } = useRole();

  const isDraft = contract.status === 'DRAFT';
  const isCancelled = contract.status === 'CANCELLED';
  const isTerminal =
    contract.status === 'SIGNED' ||
    contract.status === 'CANCELLED' ||
    contract.status === 'REJECTED';

  const canEdit = can('CONTRACT_EDIT') && isDraft;
  const canSubmit = can('CONTRACT_SUBMIT') && isDraft;
  const canCancel = can('CONTRACT_CANCEL') && !isTerminal;
  const canRecover = can('CONTRACT_RECOVER') && isCancelled;

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
        <DropdownMenuItem onClick={() => onView(contract)}>
          <Eye className="mr-2 h-4 w-4" /> Ver
        </DropdownMenuItem>

        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(contract)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
        )}

        {canSubmit && (
          <DropdownMenuItem onClick={() => onSubmit(contract)}>
            <Send className="mr-2 h-4 w-4" /> Enviar a revisión
          </DropdownMenuItem>
        )}

        {canRecover && (
          <DropdownMenuItem onClick={() => onRecover(contract)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Recuperar
          </DropdownMenuItem>
        )}

        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onCancel(contract)}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

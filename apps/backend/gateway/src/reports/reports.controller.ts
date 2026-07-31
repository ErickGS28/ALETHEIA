import {
  CONTRACTS_PATTERNS,
  RequirePrivilege,
  SERVICE_CLIENTS,
  WORKFLOW_PATTERNS,
} from '@aletheia/backend-commons';
import { Controller, Get, Inject, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { ReportFiltersDto } from './dto/report-filters.dto';

/** Privilegio que fuerza acceso total a los contratos (el reporte ve todo). */
const FULL_ACCESS = { userId: 0, privileges: ['CONTRACT_VIEW_ALL'], areaId: null };

interface ContractRow {
  folio?: string;
  title?: string;
  vendorName?: string;
  providerType?: string;
  status?: string;
  createdAt?: string | Date;
}

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy,
    @Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy,
  ) {}

  @Get('contracts')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Reporte de contratos (acceso total)' })
  contracts$(@Query() filters: ReportFiltersDto) {
    return firstValueFrom(
      this.contracts.send(CONTRACTS_PATTERNS.FIND_ALL, { user: FULL_ACCESS, filters }),
    );
  }

  @Get('audit/:contractId')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Bitácora (AuditLog) de un contrato' })
  audit(@Param('contractId', ParseIntPipe) contractId: number) {
    return firstValueFrom(this.workflow.send(WORKFLOW_PATTERNS.AUDIT, { contractId }));
  }

  @Get('export')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Exportar contratos a CSV' })
  async export(@Query() filters: ReportFiltersDto, @Res() res: Response): Promise<void> {
    const rows = await firstValueFrom<ContractRow[]>(
      this.contracts.send(CONTRACTS_PATTERNS.FIND_ALL, { user: FULL_ACCESS, filters }),
    );

    const header = 'folio,title,vendorName,providerType,status,createdAt';
    const body = (rows ?? [])
      .map((r) =>
        [r.folio, r.title, r.vendorName, r.providerType, r.status, r.createdAt]
          .map((value) => this.csvCell(value))
          .join(','),
      )
      .join('\n');
    const csv = `${header}\n${body}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contracts.csv"');
    res.send(csv);
  }

  /** Escapa una celda CSV (comillas dobles si contiene coma, comilla o salto de línea). */
  private csvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = value instanceof Date ? value.toISOString() : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Resumen ejecutivo del día: pendientes, firmados, rechazados' })
  getDailySummary() {
    return this.reportsService.getDailySummary();
  }

  @Get('bottlenecks')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Etapas del flujo con contratos que superaron su SLA' })
  getBottlenecks() {
    return this.reportsService.getBottlenecks();
  }
}

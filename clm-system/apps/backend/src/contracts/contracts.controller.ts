import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { ContractsMetricsQueryDto } from './dto/contracts-metrics-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { ContractsService } from './contracts.service';

// IMPORTANTE: las rutas estáticas (expiring, metrics) deben declararse antes de
// cualquier futura ruta dinámica GET /contracts/:id — si :id se agrega antes,
// Nest interpretaría "expiring"/"metrics" como el valor de :id.
@ApiTags('contracts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('expiring')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Contratos próximos a vencer en un rango de fechas' })
  getExpiring(@Query() query: DateRangeQueryDto) {
    return this.contractsService.getExpiring(query.startDate, query.endDate);
  }

  @Get('metrics')
  @RequirePrivilege('REPORTS_VIEW')
  @ApiOperation({ summary: 'Cantidad de contratos por estado en un rango de fechas' })
  getMetrics(@Query() query: ContractsMetricsQueryDto) {
    return this.contractsService.getMetrics(query.status, query.startDate, query.endDate);
  }
}

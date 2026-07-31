import {
  CurrentUser,
  RequirePrivilege,
  SERVICE_CLIENTS,
  type UserContext,
  WORKFLOW_PATTERNS,
} from '@aletheia/backend-commons';
import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateStageDto, TransitionDto, UpdateStageDto } from './dto/workflow.dto';

@ApiTags('workflow')
@ApiBearerAuth('access-token')
@Controller('workflow')
export class WorkflowController {
  constructor(@Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy) {}

  // --- Configuración de etapas (declarado ANTES de /:contractId) ---

  @Get('stages')
  @ApiOperation({ summary: 'Listar etapas del workflow' })
  findAllStages() {
    return firstValueFrom(this.workflow.send(WORKFLOW_PATTERNS.STAGE_FIND_ALL, {}));
  }

  @Post('stages')
  @RequirePrivilege('WORKFLOW_CONFIG')
  @ApiOperation({ summary: 'Crear etapa del workflow' })
  createStage(@Body() dto: CreateStageDto) {
    return firstValueFrom(this.workflow.send(WORKFLOW_PATTERNS.STAGE_CREATE, { dto }));
  }

  @Patch('stages/:id')
  @RequirePrivilege('WORKFLOW_CONFIG')
  @ApiOperation({ summary: 'Actualizar etapa del workflow' })
  updateStage(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStageDto) {
    return firstValueFrom(this.workflow.send(WORKFLOW_PATTERNS.STAGE_UPDATE, { id, dto }));
  }

  // --- Estado y transiciones por contrato ---

  @Get(':contractId')
  @ApiOperation({ summary: 'Estado del workflow de un contrato (etapa, SLA, historial)' })
  get(@Param('contractId', ParseIntPipe) contractId: number) {
    return firstValueFrom(this.workflow.send(WORKFLOW_PATTERNS.GET, { contractId }));
  }

  @Post(':contractId/approve')
  @ApiOperation({ summary: 'Aprobar (el privilegio lo valida el State Machine)' })
  approve(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() body: TransitionDto,
    @CurrentUser() user: UserContext,
  ) {
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId,
        action: 'APPROVE',
        comment: body.comment,
        user,
      }),
    );
  }

  @Post(':contractId/reject')
  @ApiOperation({ summary: 'Rechazar contrato' })
  reject(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() body: TransitionDto,
    @CurrentUser() user: UserContext,
  ) {
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId,
        action: 'REJECT',
        comment: body.comment,
        user,
      }),
    );
  }

  @Post(':contractId/return')
  @ApiOperation({ summary: 'Devolver contrato a la etapa anterior' })
  return(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() body: TransitionDto,
    @CurrentUser() user: UserContext,
  ) {
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId,
        action: 'RETURN',
        comment: body.comment,
        user,
      }),
    );
  }
}

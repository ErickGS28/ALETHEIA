import {
  CONTRACTS_PATTERNS,
  CurrentUser,
  RequirePrivilege,
  SERVICE_CLIENTS,
  type UserContext,
  WORKFLOW_PATTERNS,
} from '@aletheia/backend-commons';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { contractDocumentKey } from '../documents/storage/contract-document-key.util';
import { FileStorageService } from '../documents/storage/file-storage.service';
import { SaveContractDocumentDto } from './dto/contract-document.dto';
import { CancelContractDto, ContractFiltersDto } from './dto/contract-filters.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('contracts')
@ApiBearerAuth('access-token')
@Controller('contracts')
export class ContractsController {
  constructor(
    @Inject(SERVICE_CLIENTS.CONTRACTS) private readonly contracts: ClientProxy,
    @Inject(SERVICE_CLIENTS.WORKFLOW) private readonly workflow: ClientProxy,
    private readonly storage: FileStorageService,
  ) {}

  @Post()
  @RequirePrivilege('CONTRACT_CREATE')
  @ApiOperation({ summary: 'Crear contrato (DRAFT, folio autogenerado)' })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: UserContext) {
    return firstValueFrom(
      this.contracts.send(CONTRACTS_PATTERNS.CREATE, { dto, createdById: user.userId }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar contratos (filtrados por privilegios del usuario)' })
  findAll(@CurrentUser() user: UserContext, @Query() filters: ContractFiltersDto) {
    return firstValueFrom(
      this.contracts.send(CONTRACTS_PATTERNS.FIND_ALL, {
        user: { userId: user.userId, privileges: user.privileges, areaId: user.areaId },
        filters,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un contrato por id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.contracts.send(CONTRACTS_PATTERNS.FIND_ONE, { id }));
  }

  @Get(':id/document')
  @ApiOperation({ summary: 'Obtener el documento elaborado (HTML/diseño) de un contrato' })
  async getDocument(@Param('id', ParseIntPipe) id: number) {
    const raw = await this.storage.readText(contractDocumentKey(id));
    // Null when never saved — the editor treats it as an empty draft.
    return raw ? (JSON.parse(raw) as SaveContractDocumentDto) : null;
  }

  @Put(':id/document')
  @ApiOperation({ summary: 'Guardar el documento elaborado (HTML/diseño) de un contrato' })
  async saveDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveContractDocumentDto,
    @CurrentUser() user: UserContext,
  ) {
    if (!user.roles.includes('ABOGADO')) {
      throw new ForbiddenException('Solo el Abogado puede elaborar el documento formal.');
    }
    const workflow = await firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.GET, { contractId: id }),
    );
    if (workflow.status !== 'LAWYER_REVIEW') {
      throw new BadRequestException(
        'El contrato debe estar en Revisión Legal para elaborar su documento.',
      );
    }
    const document: SaveContractDocumentDto = {
      body: dto.body,
      header: dto.header ?? '',
      footer: dto.footer ?? '',
      pageSetup: dto.pageSetup,
    };
    const { fileUrl } = await this.storage.saveText(
      contractDocumentKey(id),
      JSON.stringify(document),
    );
    return { fileUrl, savedAt: new Date().toISOString() };
  }

  @Patch(':id')
  @RequirePrivilege('CONTRACT_EDIT')
  @ApiOperation({ summary: 'Editar contrato (solo en estado DRAFT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: UserContext,
  ) {
    return firstValueFrom(
      this.contracts.send(CONTRACTS_PATTERNS.UPDATE, { id, dto, userId: user.userId }),
    );
  }

  @Post(':id/submit')
  @RequirePrivilege('CONTRACT_SUBMIT')
  @ApiOperation({ summary: 'Enviar contrato a revisión (transición SUBMIT)' })
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserContext) {
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId: id,
        action: 'SUBMIT',
        user,
        createdById: user.userId,
      }),
    );
  }

  @Post(':id/cancel')
  @RequirePrivilege('CONTRACT_CANCEL')
  @ApiOperation({ summary: 'Cancelar contrato (transición CANCEL)' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelContractDto,
    @CurrentUser() user: UserContext,
  ) {
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId: id,
        action: 'CANCEL',
        comment: body.reason,
        user,
      }),
    );
  }

  @Post(':id/recover')
  @RequirePrivilege('CONTRACT_RECOVER')
  @ApiOperation({ summary: 'Recuperar contrato cancelado (transición RECOVER)' })
  recover(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserContext) {
    return firstValueFrom(
      this.workflow.send(WORKFLOW_PATTERNS.TRANSITION, {
        contractId: id,
        action: 'RECOVER',
        user,
      }),
    );
  }
}

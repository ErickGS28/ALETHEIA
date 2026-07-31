import { CONTRACTS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractsService } from './contracts.service';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';

/**
 * Controlador de microservicio para contratos: responde a mensajes Redis del gateway.
 */
@Controller()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @MessagePattern(CONTRACTS_PATTERNS.CREATE)
  create(@Payload() payload: { dto: CreateContractDto; createdById: number }) {
    return this.contractsService.create(payload.dto, payload.createdById);
  }

  @MessagePattern(CONTRACTS_PATTERNS.FIND_ALL)
  findAll(
    @Payload()
    payload: {
      user: { userId: number; privileges: string[]; areaId?: number | null };
      filters?: { status?: string; areaId?: number; providerType?: string };
    },
  ) {
    return this.contractsService.findAll(payload.user, payload.filters);
  }

  @MessagePattern(CONTRACTS_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: { id: number }) {
    return this.contractsService.findOne(payload.id);
  }

  @MessagePattern(CONTRACTS_PATTERNS.UPDATE)
  update(@Payload() payload: { id: number; dto: UpdateContractDto; userId: number }) {
    return this.contractsService.update(payload.id, payload.dto, payload.userId);
  }
}

import {
  CurrentUser,
  RequirePrivilege,
  SERVICE_CLIENTS,
  SIGNATURES_PATTERNS,
  type UserContext,
} from '@aletheia/backend-commons';
import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateSignatureDto } from './dto/signature.dto';

@ApiTags('signatures')
@ApiBearerAuth('access-token')
@Controller('signatures')
export class SignaturesController {
  constructor(@Inject(SERVICE_CLIENTS.DOCUMENTS) private readonly documents: ClientProxy) {}

  @Post(':contractId')
  @RequirePrivilege('CONTRACT_SIGN')
  @ApiOperation({ summary: 'Firmar contrato (encola CONTRACT_SIGNED hacia workflow)' })
  create(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() body: CreateSignatureDto,
    @CurrentUser() user: UserContext,
  ) {
    return firstValueFrom(
      this.documents.send(SIGNATURES_PATTERNS.CREATE, {
        dto: { contractId, ...body },
        signedById: user.userId,
      }),
    );
  }

  @Get(':contractId')
  @ApiOperation({ summary: 'Firmas de un contrato' })
  findByContract(@Param('contractId', ParseIntPipe) contractId: number) {
    return firstValueFrom(
      this.documents.send(SIGNATURES_PATTERNS.FIND_BY_CONTRACT, { contractId }),
    );
  }
}

import { type ContractSignedJob, JOBS, QUEUES } from '@aletheia/backend-commons';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSignatureDto } from './dto/signature.dto';
import { SignatureStrategyFactory } from './strategies/signature-strategy.factory';

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategyFactory: SignatureStrategyFactory,
    @InjectQueue(QUEUES.WORKFLOW_INBOUND) private readonly workflowQueue: Queue,
  ) {}

  /**
   * Aplica la estrategia de firma, persiste la Signature y encola en
   * WORKFLOW_INBOUND el job CONTRACT_SIGNED para que workflow ejecute la
   * transición SIGN.
   */
  async create(dto: CreateSignatureDto, signedById: number) {
    const strategy = this.strategyFactory.resolve(dto.method);
    const { method, signatureData } = strategy.sign({ signatureData: dto.signatureData });

    const signature = await this.prisma.signature.create({
      data: {
        contractId: dto.contractId,
        apoderadoId: dto.apoderadoId ?? null,
        signedById,
        method,
        signatureData,
      },
    });

    const job: ContractSignedJob = { contractId: dto.contractId, signedById };
    await this.workflowQueue.add(JOBS.CONTRACT_SIGNED, job);

    return signature;
  }

  /** Firmas de un contrato, más recientes primero. */
  findByContract(contractId: number) {
    return this.prisma.signature.findMany({
      where: { contractId },
      orderBy: { signedAt: 'desc' },
    });
  }
}

import { QUEUES } from '@aletheia/backend-commons';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { SignatureStrategyFactory } from './strategies/signature-strategy.factory';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.WORKFLOW_INBOUND })],
  controllers: [SignaturesController],
  providers: [SignaturesService, SignatureStrategyFactory],
})
export class SignaturesModule {}

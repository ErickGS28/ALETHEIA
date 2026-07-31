import { QUEUES } from '@aletheia/backend-commons';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.CONTRACTS_INBOUND }, { name: QUEUES.NOTIFICATIONS }),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}

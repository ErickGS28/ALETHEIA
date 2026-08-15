import { Module } from '@nestjs/common';
import { StorageModule } from '../documents/storage/storage.module';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [StorageModule],
  controllers: [WorkflowController],
})
export class WorkflowModule {}

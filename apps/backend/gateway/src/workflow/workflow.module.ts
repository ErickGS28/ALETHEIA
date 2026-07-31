import { Module } from '@nestjs/common';
import { FileStorageService } from '../documents/storage/file-storage.service';
import { WorkflowController } from './workflow.controller';

@Module({
  controllers: [WorkflowController],
  providers: [FileStorageService],
})
export class WorkflowModule {}

import { Module } from '@nestjs/common';
import { FileStorageService } from '../documents/storage/file-storage.service';
import { ContractsController } from './contracts.controller';

@Module({
  controllers: [ContractsController],
  providers: [FileStorageService],
})
export class ContractsModule {}

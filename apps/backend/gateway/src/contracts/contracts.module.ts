import { Module } from '@nestjs/common';
import { StorageModule } from '../documents/storage/storage.module';
import { ContractsController } from './contracts.controller';

@Module({
  imports: [StorageModule],
  controllers: [ContractsController],
})
export class ContractsModule {}

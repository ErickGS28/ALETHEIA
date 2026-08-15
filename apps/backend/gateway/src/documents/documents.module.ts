import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { FilesController } from './files.controller';
import { SignaturesController } from './signatures.controller';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DocumentsController, FilesController, SignaturesController],
})
export class DocumentsModule {}

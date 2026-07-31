import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { FilesController } from './files.controller';
import { SignaturesController } from './signatures.controller';
import { FileStorageService } from './storage/file-storage.service';

@Module({
  controllers: [DocumentsController, FilesController, SignaturesController],
  providers: [FileStorageService],
})
export class DocumentsModule {}

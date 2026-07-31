import {
  CurrentUser,
  DOCUMENTS_PATTERNS,
  RequirePrivilege,
  SERVICE_CLIENTS,
  type UserContext,
} from '@aletheia/backend-commons';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateDocumentDto, CreateVersionDto, ProviderTypeQueryDto } from './dto/document.dto';
import { FileStorageService } from './storage/file-storage.service';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(
    @Inject(SERVICE_CLIENTS.DOCUMENTS) private readonly documents: ClientProxy,
    private readonly storage: FileStorageService,
  ) {}

  // Declarado ANTES de /:contractId para que 'required' no se capture como contractId.
  @Get('required')
  @ApiOperation({ summary: 'Documentos requeridos según tipo de proveedor (Factory)' })
  required(@Query() query: ProviderTypeQueryDto) {
    return firstValueFrom(
      this.documents.send(DOCUMENTS_PATTERNS.REQUIRED, { providerType: query.providerType }),
    );
  }

  @Post(':contractId')
  @RequirePrivilege('DOCUMENT_UPLOAD')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Subir/crear documento de un contrato (multipart o JSON)' })
  async create(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() body: CreateDocumentDto,
    @CurrentUser() user: UserContext,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const fileMeta = await this.resolveFileMeta(file, body);

    return firstValueFrom(
      this.documents.send(DOCUMENTS_PATTERNS.CREATE, {
        dto: { contractId, ...body, ...fileMeta },
        uploadedById: user.userId,
      }),
    );
  }

  @Get(':contractId')
  @ApiOperation({ summary: 'Documentos de un contrato (incluye versiones)' })
  findByContract(@Param('contractId', ParseIntPipe) contractId: number) {
    return firstValueFrom(this.documents.send(DOCUMENTS_PATTERNS.FIND_BY_CONTRACT, { contractId }));
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Versiones de un documento' })
  findVersions(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.documents.send(DOCUMENTS_PATTERNS.VERSION_FIND, { documentId: id }));
  }

  @Post(':id/versions')
  @RequirePrivilege('DOCUMENT_VERSION')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Crear nueva versión de un documento (multipart o JSON)' })
  async createVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVersionDto,
    @CurrentUser() user: UserContext,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const fileMeta = await this.resolveFileMeta(file, dto);

    return firstValueFrom(
      this.documents.send(DOCUMENTS_PATTERNS.VERSION_CREATE, {
        documentId: id,
        dto: { ...dto, ...fileMeta },
        uploadedById: user.userId,
      }),
    );
  }

  /**
   * If a binary file is uploaded, persists it to disk and returns servable
   * fileUrl/fileSize/mimeType. Otherwise falls back to the plain fileUrl string
   * already present in the body (backwards compatible). Throws when neither is provided.
   */
  private async resolveFileMeta(
    file: Express.Multer.File | undefined,
    body: { fileUrl?: string },
  ): Promise<{ fileUrl: string; fileSize?: number; mimeType?: string } | Record<string, never>> {
    if (file) {
      const { fileUrl, fileSize, mimeType } = await this.storage.save(file);
      return { fileUrl, fileSize, mimeType };
    }
    if (!body.fileUrl) {
      throw new BadRequestException('Debe subir un archivo (campo "file") o enviar "fileUrl".');
    }
    return {};
  }
}

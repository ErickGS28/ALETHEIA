import { QUEUES, bullConnection, defaultJobOptions } from '@aletheia/backend-commons';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DocumentsModule } from './documents/documents.module';
import { PrismaModule } from './prisma/prisma.module';
import { SignaturesModule } from './signatures/signatures.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection: bullConnection(), defaultJobOptions }),
    // documents solo PRODUCE en WORKFLOW_INBOUND (no consume colas).
    BullModule.registerQueue({ name: QUEUES.WORKFLOW_INBOUND }),
    PrismaModule,
    DocumentsModule,
    SignaturesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

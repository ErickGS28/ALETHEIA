import { bullConnection, defaultJobOptions } from '@aletheia/backend-commons';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueuesModule } from './queues/queues.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection: bullConnection(), defaultJobOptions }),
    PrismaModule,
    WorkflowModule,
    NotificationsModule,
    QueuesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

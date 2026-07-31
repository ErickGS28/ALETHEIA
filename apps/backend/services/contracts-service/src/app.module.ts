import { QUEUES, bullConnection, defaultJobOptions } from '@aletheia/backend-commons';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CatalogsModule } from './catalogs/catalogs.module';
import { ContractsModule } from './contracts/contracts.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection: bullConnection(), defaultJobOptions }),
    BullModule.registerQueue({ name: QUEUES.CONTRACTS_INBOUND }),
    PrismaModule,
    ContractsModule,
    CatalogsModule,
    EventsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

import { JwtAuthGuard, JwtStrategy, PrivilegeGuard } from '@aletheia/backend-commons';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { ClientsRegistryModule } from './common/clients.module';
import { ContractsModule } from './contracts/contracts.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueuesModule } from './queues/queues.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    ClientsRegistryModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    CatalogsModule,
    WorkflowModule,
    NotificationsModule,
    DocumentsModule,
    ReportsModule,
    QueuesModule,
  ],
  providers: [
    JwtStrategy,
    // Protección global: JWT primero, luego privilegios. @Public() exenta rutas.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PrivilegeGuard },
  ],
})
export class AppModule {}

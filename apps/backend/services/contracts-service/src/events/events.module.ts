import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { StatusMirrorProcessor } from './status-mirror.processor';

/**
 * Módulo de eventos asíncronos: registra el processor que consume CONTRACTS_INBOUND.
 * Depende de ContractsModule para reutilizar el ContractsRepository.
 */
@Module({
  imports: [ContractsModule],
  providers: [StatusMirrorProcessor],
})
export class EventsModule {}

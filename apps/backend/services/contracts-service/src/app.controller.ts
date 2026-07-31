import { CONTRACTS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern(CONTRACTS_PATTERNS.PING)
  ping() {
    return { service: 'contracts-service', status: 'ok' };
  }
}

import { DOCUMENTS_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern(DOCUMENTS_PATTERNS.PING)
  ping() {
    return { service: 'documents-service', status: 'ok' };
  }
}

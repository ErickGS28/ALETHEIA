import { WORKFLOW_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern(WORKFLOW_PATTERNS.PING)
  ping() {
    return { service: 'workflow-service', status: 'ok' };
  }
}

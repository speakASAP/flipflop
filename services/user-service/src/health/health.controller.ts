/**
 * Health Check Controller
 */

import { Controller, Get } from '@nestjs/common';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return ApiResponseUtil.success({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-service',
    });
  }
}


/**
 * Health Check Controller
 * Enhanced with dependency checking
 */

import { Controller, Get } from '@nestjs/common';
import { ApiResponseUtil } from '@shared/utils/api-response.util';
import { HealthService } from '@shared/health/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async health() {
    const healthStatus = await this.healthService.getHealthStatus('order-service');
    return ApiResponseUtil.success(healthStatus);
  }
}

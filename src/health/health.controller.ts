import { Controller, Get } from '@nestjs/common';

/**
 * Production health check endpoint.
 * Use for load balancers, Kubernetes liveness/readiness, and monitoring.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vision-ops',
    };
  }
}

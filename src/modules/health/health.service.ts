import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getRoot() {
    return {
      status: 'ok',
      message: 'Vision Ops API is running',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getRoot(): { name: string; version: string; status: string } {
    return {
      name: 'vision-ops',
      version: '0.0.1',
      status: 'ok',
    };
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

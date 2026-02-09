import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getHealth(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
    getRoot(): {
        status: string;
        message: string;
    };
}

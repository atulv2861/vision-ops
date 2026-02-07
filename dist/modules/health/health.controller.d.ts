import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getRoot(): {
        name: string;
        version: string;
        status: string;
    };
    getHealth(): {
        status: string;
        timestamp: string;
    };
}

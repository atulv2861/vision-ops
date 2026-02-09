export declare class HealthService {
    getRoot(): {
        status: string;
        message: string;
    };
    getHealth(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
}

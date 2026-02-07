export declare class HealthService {
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

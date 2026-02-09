declare const _default: () => {
    port: number;
    nodeEnv: string;
    apiPrefix: string;
    cors: {
        origin: string[];
        credentials: boolean;
    };
    logging: {
        level: string;
    };
    kafka: {
        broker: string;
        clientId: string;
        groupId: string;
        connectionTimeout: number;
        requestTimeout: number;
        retry: {
            retries: number;
            initialRetryTime: number;
            multiplier: number;
        };
        producer: {
            delayBetweenMessages: number;
        };
        topics: {
            cameraEvents: string;
        };
    };
};
export default _default;

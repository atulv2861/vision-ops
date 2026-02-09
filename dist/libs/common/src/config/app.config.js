"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    apiPrefix: process.env.API_PREFIX ?? 'api',
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
        credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    logging: {
        level: process.env.LOG_LEVEL ?? 'info',
    },
    kafka: {
        broker: process.env.KAFKA_BROKER ?? 'localhost:9092',
        clientId: process.env.KAFKA_CLIENT_ID ?? 'vision-ops-consumer',
        groupId: process.env.KAFKA_GROUP_ID ?? 'vision-ops-group',
        connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT ?? '3000', 10),
        requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT ?? '30000', 10),
        retry: {
            retries: parseInt(process.env.KAFKA_RETRIES ?? '5', 10),
            initialRetryTime: parseInt(process.env.KAFKA_INITIAL_RETRY_TIME ?? '100', 10),
            multiplier: parseFloat(process.env.KAFKA_RETRY_MULTIPLIER ?? '2'),
        },
        producer: {
            delayBetweenMessages: parseInt(process.env.KAFKA_PRODUCER_DELAY_MS ?? '5000', 10),
        },
        topics: {
            cameraEvents: process.env.KAFKA_TOPIC_CAMERA_EVENTS ?? 'visionops.camera.events.v1',
        },
    },
});
//# sourceMappingURL=app.config.js.map
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
});
//# sourceMappingURL=app.config.js.map
export default () => ({
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
    topics: {
      cameraEvents: process.env.KAFKA_TOPIC_CAMERA_EVENTS ?? 'visionops.camera.events.v1',
    },
  },
});

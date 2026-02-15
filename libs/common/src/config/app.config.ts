export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:5173'],
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
    topics: {
      cameraOccupancy: process.env.KAFKA_TOPIC_CAMERA_OCCUPANCY ?? 'visionops.camera.occupancy.v1',
    },
    producer: {
      clientId: process.env.KAFKA_PRODUCER_CLIENT_ID ?? 'vision-ops-producer',
      cameraOccupancyDataPath:
        process.env.KAFKA_CAMERA_OCCUPANCY_DATA_PATH ?? 'data/vision-ops-camera.json',
      startDelayMs: parseInt(process.env.KAFKA_PRODUCER_START_DELAY_MS ?? '5000', 10),
      intervalMs: parseInt(process.env.KAFKA_PRODUCER_INTERVAL_MS ?? '5000', 10),
    },
  },
  filter: {
    locationApiUrl: process.env.FILTER_LOCATION_API_URL ?? '',
    locationApiTimeoutMs: parseInt(process.env.FILTER_LOCATION_API_TIMEOUT_MS ?? '10000', 10),
    cameraDetailsApiUrl: process.env.FILTER_CAMERA_DETAILS_API_URL ?? 'http://localhost:4000',
    cameraDetailsApiTimeoutMs: parseInt(process.env.FILTER_CAMERA_DETAILS_API_TIMEOUT_MS ?? '5000', 10),
    cameraDetailsCacheTtlMs: parseInt(process.env.FILTER_CAMERA_DETAILS_CACHE_TTL_MS ?? '600000', 10),
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE ?? 'http://34.173.116.41:9200',
    username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD ?? 'variphi@2024',
    index: process.env.ELASTICSEARCH_INDEX ?? 'vision-ops-overview',
    cameraIndex: process.env.ELASTICSEARCH_CAMERA_INDEX ?? 'vision-ops-camera',
    requestTimeout: parseInt(process.env.ELASTICSEARCH_REQUEST_TIMEOUT ?? '30000', 10),
  },
});

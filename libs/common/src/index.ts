/**
 * Vision Ops – shared library public API.
 * Use this barrel for consistent imports from app and other consumers.
 */

export { ConfigModule, appConfig } from './config';
export { EnrichmentModule, CameraDetailsService } from './enrichment';
export type { CameraDetails } from './enrichment';
export {
  ElasticModule,
  ElasticService,
  VISION_OPS_CAMERA_INDEX_NAME,
  VISION_OPS_CAMERA_INDEX_MAPPING,
  VISION_OPS_CAMERA_INDEX_SETTINGS,
} from './elastic';
export { AllExceptionsFilter } from './filters';
export { LoggingInterceptor } from './interceptors';
export {
  KafkaModule,
  KafkaConsumerService,
  KafkaProducerService,
} from './kafka';
export type { CameraOccupancyDocument, CameraOccupancyPerson } from './kafka';
export { UtilsModule, UtilsService } from './utils';

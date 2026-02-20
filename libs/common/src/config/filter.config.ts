import { registerAs } from '@nestjs/config';

export const FILTER_CONFIG = registerAs('filter', () => ({
  locationApiUrl: process.env.FILTER_LOCATION_API_URL ?? '',
  locationApiTimeoutMs: parseInt(
    process.env.FILTER_LOCATION_API_TIMEOUT_MS ?? '10000',
    10,
  ),
  cameraDetailsApiUrl:
    process.env.FILTER_CAMERA_DETAILS_API_URL ?? 'http://localhost:4000',
  cameraDetailsApiTimeoutMs: parseInt(
    process.env.FILTER_CAMERA_DETAILS_API_TIMEOUT_MS ?? '5000',
    10,
  ),
}));

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CameraDetails = {
  camera_id: string;
  name: string;
  client_id: string;
  location: string;
  location_id: string;
  status: string;
};

type CacheEntry = { data: CameraDetails; expiresAt: number };

@Injectable()
export class CameraDetailsService {
  private readonly logger = new Logger(CameraDetailsService.name);
  /** In-memory map cache: camera_id -> { data, expiresAt }. Used in production to avoid API calls when camera_id was already fetched (TTL from config). */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get camera details by camera_id.
   * Uses in-memory map cache (production-safe): if camera_id exists in cache and not expired, returns cached data; otherwise calls API and stores result in cache (TTL configurable, default 10 min).
   * Returns null on error or timeout so consumer can still index Kafka payload.
   */
  async getByCameraId(camera_id: string): Promise<CameraDetails | null> {
    if (!camera_id?.trim()) return null;

    // Check map first: if camera_id exists in cache, return cached data (no API call)
    const cached = this.getFromCache(camera_id);
    if (cached) {
      this.logger.debug(`Camera details cache hit for camera_id=${camera_id}`);
      return cached;
    }

    // Cache miss: call API and then store in map
    const baseUrl = this.configService.get<string>('filter.cameraDetailsApiUrl')?.trim();
    const timeoutMs = this.configService.get<number>('filter.cameraDetailsApiTimeoutMs', 5000);

    if (!baseUrl) {
      this.logger.debug('FILTER_CAMERA_DETAILS_API_URL not set');
      return null;
    }

    const url = `${baseUrl.replace(/\/$/, '')}/camera/details/${encodeURIComponent(camera_id)}`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: ac.signal,
      });
      clearTimeout(t);

      if (!res.ok) {
        this.logger.warn(`Camera details API ${res.status} for camera_id=${camera_id}`);
        return null;
      }

      const data = (await res.json()) as Record<string, unknown>;
      const details: CameraDetails = {
        camera_id: (data.camera_id as string) ?? camera_id,
        name: (data.name as string) ?? (data.camera_name as string) ?? '',
        client_id: (data.client_id as string) ?? '',
        location: (data.location as string) ?? '',
        location_id: (data.location_id as string) ?? '',
        status: (data.status as string) ?? (data.camera_status as string) ?? '',
      };
      this.setCache(camera_id, details);
      return details;
    } catch (err) {
      this.logger.warn(
        `Camera details API failed for camera_id=${camera_id}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private getFromCache(camera_id: string): CameraDetails | null {
    const entry = this.cache.get(camera_id);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(camera_id);
      return null;
    }
    return entry.data;
  }

  private setCache(camera_id: string, data: CameraDetails): void {
    const ttlMs = this.configService.get<number>('filter.cameraDetailsCacheTtlMs', 600_000);
    this.cache.set(camera_id, { data, expiresAt: Date.now() + ttlMs });
  }
}

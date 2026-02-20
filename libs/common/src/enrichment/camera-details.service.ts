import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CameraDetails = {
  camera_id: string;
  name: string;
  client_id: string;
  location: string;
  location_id: string;
};

@Injectable()
export class CameraDetailsService {
  private readonly logger = new Logger(CameraDetailsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get camera details by camera_id.
   * Calls the camera details API. Returns null on error or timeout.
   */
  async getByCameraId(camera_id: string): Promise<CameraDetails | null> {
    if (!camera_id?.trim()) return null;

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
      };
      return details;
    } catch (err) {
      this.logger.warn(
        `Camera details API failed for camera_id=${camera_id}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }
}

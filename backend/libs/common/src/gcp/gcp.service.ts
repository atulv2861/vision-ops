import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GCPService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.configService.get('GCP.PROJECT_ID') &&
      this.configService.get('GCP.BUCKET_NAME')
    );
  }
}

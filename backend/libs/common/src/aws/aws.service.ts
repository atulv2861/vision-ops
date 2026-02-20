import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AWSService {
  constructor(private readonly configService: ConfigService) {}

  getBucketName(): string | undefined {
    return this.configService.get<string>('UPLOAD.S3_BUCKET_NAME');
  }

  isConfigured(): boolean {
    return !!(
      this.configService.get('UPLOAD.S3_BUCKET_NAME') &&
      this.configService.get('UPLOAD.S3_REGION')
    );
  }
}

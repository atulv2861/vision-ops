import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  async upload(file: any, key: string): Promise<string> {
    // Storage service implementation when needed
    console.log(`Uploading file: ${key}`);
    return key;
  }

  async delete(key: string): Promise<void> {
    console.log(`Deleting file: ${key}`);
  }
}

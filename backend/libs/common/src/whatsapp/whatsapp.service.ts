import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  constructor(private readonly configService: ConfigService) {}

  async sendMessage(to: string, message: string): Promise<void> {
    // WhatsApp service implementation when needed
    console.log(`Sending WhatsApp message to ${to}: ${message}`);
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    // Mail service implementation when needed
    console.log(`Sending email to ${to}: ${subject}`);
  }
}

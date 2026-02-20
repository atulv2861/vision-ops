import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from '../interfaces';

@Injectable()
export class UtilService {
  @Inject(ConfigService) private readonly configService: ConfigService;
  @Inject(JwtService) private readonly jwtService: JwtService;

  async setupToken(data: { id: string }): Promise<string> {
    const tokenPayload: TokenPayload = { userId: data.id };
    const token = await this.jwtService.signAsync(tokenPayload);
    return token;
  }
}

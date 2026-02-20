import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions, JwtOptionsFactory } from '@nestjs/jwt';

@Injectable()
export class JwtConfigService implements JwtOptionsFactory {
  @Inject(ConfigService) private readonly configService: ConfigService;

  createJwtOptions(): JwtModuleOptions {
    return {
      secret: this.configService.get<string>('JWT.SECRET'),
      signOptions: {
        expiresIn: `${this.configService.get('JWT.EXPIRE_TIME')}s`,
      },
    };
  }
}

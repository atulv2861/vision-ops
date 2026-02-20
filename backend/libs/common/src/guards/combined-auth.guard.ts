import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private apiKeyAuthGuard;
  private jwtAuthGuard;

  constructor() {
    this.apiKeyAuthGuard = new (AuthGuard('api-key'))();
    this.jwtAuthGuard = new (AuthGuard('jwt'))();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];
    const apiSecretHeader = request.headers['x-api-secret'];

    if (apiKeyHeader || apiSecretHeader) {
      const isApiKeyAuthValid = await this.tryAuthenticate(
        this.apiKeyAuthGuard,
        context,
      );
      if (isApiKeyAuthValid) return true;
    } else {
      const isJwtAuthValid = await this.tryAuthenticate(
        this.jwtAuthGuard,
        context,
      );
      if (isJwtAuthValid) return true;
    }

    return false;
  }

  private async tryAuthenticate(
    authGuard: any,
    context: ExecutionContext,
  ): Promise<boolean> {
    return (await authGuard.canActivate(context)) as boolean;
  }
}

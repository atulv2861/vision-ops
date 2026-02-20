import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiResponse } from '../interfaces';

@Injectable()
export class LogoutInterceptor<T> implements NestInterceptor<T, ApiResponse> {
  intercept(
    context: ExecutionContext,
    handler: CallHandler<T>,
  ): Observable<ApiResponse> {
    return handler
      .handle()
      .pipe(
        switchMap(async (data: any) => this.serializeResponse(data, context)),
      );
  }

  private async serializeResponse(
    _data: any,
    context: ExecutionContext,
  ): Promise<ApiResponse> {
    const response = context.switchToHttp().getResponse();
    await response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    return {
      data: { msg: 'Logout successfully!' },
      error: false,
      success: true,
    };
  }
}

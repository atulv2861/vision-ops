import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToClass } from 'class-transformer';
import { ApiResponse } from '../interfaces';

interface ClassConstructor<T> {
  new (...args: any[]): T;
}

export function SerializeResponse<T>(
  dto: ClassConstructor<T>,
): ReturnType<typeof UseInterceptors> {
  return UseInterceptors(new SerializeInterceptor(dto));
}

@Injectable()
export class SerializeInterceptor<T> implements NestInterceptor<T, ApiResponse> {
  constructor(private readonly dto: ClassConstructor<T>) {}

  intercept(
    context: ExecutionContext,
    handler: CallHandler<T>,
  ): Observable<ApiResponse> {
    return handler.handle().pipe(
      map((data: any) => {
        if (data?.buffer_data) {
          this.handleFileDownload(data, context);
          return null;
        }
        return this.handleApiResponse(data, context);
      }),
    );
  }

  private handleFileDownload(data: any, context: ExecutionContext): void {
    if (!data.name || !data.buffer_data) {
      throw new Error('Invalid data for download.');
    }
    const response = context.switchToHttp().getResponse();
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=${data.name}.zip`,
    );
    response.setHeader('Content-Length', Buffer.byteLength(data.buffer_data));
    response.send(data.buffer_data);
  }

  private handleApiResponse(data: any, context: ExecutionContext): ApiResponse {
    const request = context.switchToHttp().getRequest();
    const { response: resData, totalCount } = data ?? {};

    const validatedResponse = plainToClass(this.dto, resData, {
      excludeExtraneousValues: true,
    });

    if (Array.isArray(validatedResponse)) {
      return this.buildPaginatedResponse(
        validatedResponse,
        totalCount ?? 0,
        request.query,
      );
    }

    return { data: validatedResponse as any, error: false, success: true };
  }

  private buildPaginatedResponse(
    data: any[],
    totalCount: number,
    query: { [key: string]: any },
  ): ApiResponse {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalCount,
      },
      error: false,
      success: true,
    };
  }
}

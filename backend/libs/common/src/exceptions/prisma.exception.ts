import {
  ArgumentsHost,
  Catch,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

export const errorMappings: Record<
  string,
  { status: number; message: string }
> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'Input Data is too long' },
  P2001: { status: HttpStatus.NO_CONTENT, message: 'Record does not exist' },
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Reference Data already exists',
  },
  P2025: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid parameter provided',
  },
  P2026: { status: HttpStatus.NOT_FOUND, message: 'Resource not found' },
  P2027: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Unexpected error occurred',
  },
  P3000: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Prisma encountered an internal error',
  },
  P3001: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid input for operation',
  },
  P3002: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Unauthorized access to resource',
  },
  P3003: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Prisma: Unique constraint violated',
  },
  P3004: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Prisma: Foreign key constraint failed',
  },
  P4000: { status: HttpStatus.BAD_REQUEST, message: 'Invalid request format' },
  P4001: {
    status: HttpStatus.FORBIDDEN,
    message: 'Access to the resource is forbidden',
  },
  P5000: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const errorMapping = errorMappings[exception.code];

    if (errorMapping) {
      const { status, message } = errorMapping;
      (response as any).status(status).json({
        success: false,
        error: true,
        message,
      });
    } else {
      (response as any).status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: true,
        message: 'Internal server error',
      });
    }
  }
}

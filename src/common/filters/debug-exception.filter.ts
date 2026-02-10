import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Filter to catch all exceptions and log them to a file for debugging
 */
@Catch()
export class DebugExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorLog = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception.message || 'Internal server error',
            stack: exception.stack,
            rawError: JSON.stringify(exception, Object.getOwnPropertyNames(exception)),
        };

        // Log to console (so it appears in user's terminal)
        console.error('Debug Exception Log:', errorLog);

        // Log to file for guaranteed visibility
        const logPath = path.join(process.cwd(), 'debug_error.log');
        fs.appendFileSync(logPath, JSON.stringify(errorLog, null, 2) + '\n---\n');

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception.message || 'Internal server error',
        });
    }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as any;

    let code = `ERR_${status}`;
    let message = exception.message;

    if (typeof errorResponse === 'object' && errorResponse.message) {
      if (Array.isArray(errorResponse.message)) {
        message = errorResponse.message.join(', ');
      } else {
        message = errorResponse.message;
      }
      if (errorResponse.code) {
        code = errorResponse.code;
      }
    }

    response.status(status).json({
      code,
      message,
      details: typeof errorResponse === 'object' ? errorResponse.details || null : null,
      timestamp: Date.now(),
    });
  }
}

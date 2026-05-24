import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  message: string;
  success: false;
}

/** Shape of Prisma PrismaClientKnownRequestError (used so build does not depend on @db type resolution) */
interface PrismaKnownErrorLike {
  code: string;
  message: string;
  meta?: { target?: string | string[] };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unknown error occurred',
      success: false,
    };

    if (exception instanceof HttpException) {
      const ex = exception;
      const exceptionResponse = ex.getResponse();
      errorResponse.statusCode = ex.getStatus();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse) {
        const message = (exceptionResponse as { message: string | string[] }).message;
        if (Array.isArray(message)) errorResponse.message = message[0];
        else if (typeof message === 'string') errorResponse.message = message;
      } else {
        errorResponse.message = ex.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const ex: PrismaKnownErrorLike = exception as PrismaKnownErrorLike;
      const target = ex.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(', ') : (target ?? '');
      switch (ex.code) {
        case 'P2002':
          errorResponse.statusCode = HttpStatus.CONFLICT;
          errorResponse.message = 'Unique constraint failed on the fields: ' + targetStr;
          break;
        case 'P2025':
          errorResponse.statusCode = HttpStatus.NOT_FOUND;
          errorResponse.message = 'Record to update not found.';
          break;
        default:
          errorResponse.statusCode = HttpStatus.BAD_REQUEST;
          errorResponse.message = `Database error: ${ex.message}`;
      }
    } else if (exception instanceof Error) {
      errorResponse.message = exception.message;
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }
}

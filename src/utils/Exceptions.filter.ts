import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Handles exceptions thrown during request processing.
   * Determines the appropriate HTTP status code and message to send as a response.
   * Differentiates between HttpException and generic Error to format the response accordingly.
   *
   * @param error - The error instance which can be an HttpException or a generic Error.
   * @param host - The arguments host containing the context of the request.
   */

  catch(error: HttpException | Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (error instanceof HttpException) {
      const response = error.getResponse();
      message =
        typeof response === 'string'
          ? response
          : (response as { message?: string; error?: string })?.message ||
            (response as { message?: string; error?: string })?.error ||
            'Internal server error';
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = 'Internal server error';
    }

    if (status >= 500) {
      this.logger.error(
        `${status} ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    } else {
      this.logger.warn(`${status} ${message}`);
    }

    void response.status(status).send({
      statusCode: status,
      message: message,
    });
  }
}

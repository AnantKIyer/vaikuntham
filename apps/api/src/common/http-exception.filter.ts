import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === "object" && body !== null) {
        const record = body as Record<string, unknown>;
        if ("ok" in record && record.ok === false) {
          response.status(status).json(record);
          return;
        }
        if ("error" in record) {
          response.status(status).json({
            ok: false,
            error: String(record.error),
            code:
              typeof record.code === "string"
                ? record.code
                : status === HttpStatus.UNAUTHORIZED
                  ? "UNAUTHENTICATED"
                  : status === HttpStatus.FORBIDDEN
                    ? "FORBIDDEN"
                    : undefined,
          });
          return;
        }
      }

      response.status(status).json({
        ok: false,
        error:
          typeof body === "string"
            ? body
            : exception.message || "Request failed",
        code:
          status === HttpStatus.UNAUTHORIZED
            ? "UNAUTHENTICATED"
            : status === HttpStatus.FORBIDDEN
              ? "FORBIDDEN"
              : undefined,
      });
      return;
    }

    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: "Something went wrong",
    });
  }
}

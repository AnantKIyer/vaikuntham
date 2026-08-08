import {
  Injectable,
  Logger,
  NestMiddleware,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/** Logs slow API requests in development to surface DB / auth overhead. */
@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV === "production") {
      next();
      return;
    }

    const start = performance.now();
    res.on("finish", () => {
      const ms = Math.round(performance.now() - start);
      if (ms >= 200) {
        this.logger.warn(`${req.method} ${req.originalUrl} ${ms}ms`);
      }
    });
    next();
  }
}

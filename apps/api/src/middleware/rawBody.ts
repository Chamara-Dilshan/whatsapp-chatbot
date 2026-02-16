import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * Express json() verify callback that captures the raw body buffer.
 * Used for HMAC signature verification on webhook endpoints.
 */
export function captureRawBody(req: Request, _res: unknown, buf: Buffer): void {
  req.rawBody = buf;
}

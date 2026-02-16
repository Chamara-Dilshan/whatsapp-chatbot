import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from './errorHandler';

/**
 * Middleware factory that restricts access to specific roles.
 * Must be used after requireAuth.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(new ForbiddenError(`Role '${req.auth.role}' is not authorized for this action`));
      return;
    }

    next();
  };
}

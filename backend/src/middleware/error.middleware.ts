import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors/app-error';
import { sendError } from '../shared/utils/response.util';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response {
  // 1. AppError subclasses
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[AppError ${err.statusCode}] ${err.message}`, { stack: err.stack, details: err.details });
    } else {
      logger.warn(`[AppError ${err.statusCode}] ${err.message}`, { path: req.path, details: err.details });
    }
    return sendError(res, err.message, err.statusCode, err.details, err.code);
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code
    }));
    logger.warn(`[Validation Error] ${req.method} ${req.path}`, formattedErrors);
    return sendError(res, 'Request validation failed', 422, formattedErrors, 'VALIDATION_ERROR');
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(`[Prisma Error ${err.code}] ${err.message}`);
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        return sendError(
          res,
          `A record with this ${target.join(', ')} already exists.`,
          409,
          { fields: target },
          'UNIQUE_CONSTRAINT_VIOLATION'
        );
      }
      case 'P2025': {
        return sendError(res, 'The requested record was not found or has been deleted.', 404, null, 'RECORD_NOT_FOUND');
      }
      case 'P2003': {
        return sendError(
          res,
          'Foreign key constraint failed. Related record does not exist.',
          400,
          err.meta,
          'FOREIGN_KEY_VIOLATION'
        );
      }
      default:
        return sendError(res, 'Database operation failed', 500, { prismaCode: err.code });
    }
  }

  // 4. Fallback for unhandled unexpected errors
  logger.error(`[Unhandled Exception] ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const message = process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message;
  return sendError(res, message, 500, process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined);
}

import { Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../../src/middleware/error.middleware';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnauthorizedError
} from '../../src/shared/errors/app-error';

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('errorHandler Middleware (Unit Tests)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      path: '/api/v1/tasks',
      method: 'POST'
    };

    mockRes = {
      status: statusMock,
      json: jsonMock
    };
  });

  it('should format and respond with AppError subclasses (e.g. 404 NotFoundError)', () => {
    const error = new NotFoundError('Task not found');
    errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Task not found',
          code: 'ERR_404'
        })
      })
    );
  });

  it('should format and respond with 409 on ConflictError (OCC Conflict)', () => {
    const error = new ConflictError('Task was modified concurrently. Please refresh.');
    errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Task was modified concurrently. Please refresh.',
          code: 'ERR_409'
        })
      })
    );
  });

  it('should format ZodError into 422 with structured field paths', () => {
    const schema = z.object({
      title: z.string().min(3),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH'])
    });

    let zodErr: ZodError | null = null;
    try {
      schema.parse({ title: 'a', priority: 'INVALID_PRIORITY' });
    } catch (e: any) {
      zodErr = e;
    }

    expect(zodErr).not.toBeNull();
    errorHandler(zodErr!, mockReq as Request, mockRes as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ path: 'title' }),
            expect.objectContaining({ path: 'priority' })
          ])
        })
      })
    );
  });

  it('should format Prisma P2002 unique constraint violation as 409', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['email'] }
    });

    errorHandler(prismaError, mockReq as Request, mockRes as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: expect.stringContaining('email')
        })
      })
    );
  });

  it('should format Prisma P2025 record not found as 404', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
      code: 'P2025',
      clientVersion: '5.0.0'
    });

    errorHandler(prismaError, mockReq as Request, mockRes as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RECORD_NOT_FOUND'
        })
      })
    );
  });

  it('should format unhandled generic Error as 500', () => {
    const genericErr = new Error('Unexpected database socket timeout');
    errorHandler(genericErr, mockReq as Request, mockRes as Response, jest.fn());

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'ERR_500'
        })
      })
    );
  });
});

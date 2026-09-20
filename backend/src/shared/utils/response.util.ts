import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
}

export function sendCreated<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  details?: any,
  code?: string
): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code: code || `ERR_${statusCode}`,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
}

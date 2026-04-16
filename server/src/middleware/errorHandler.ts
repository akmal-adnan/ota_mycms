import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface MongoServerError extends Error {
  code?: number;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const mongoErr = err as MongoServerError;
  if (mongoErr.code === 11000) {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  if (err.name === 'MulterError') {
    res.status(400).json({ error: err.message });
    return;
  }

  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
}

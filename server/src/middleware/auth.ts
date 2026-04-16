import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

interface JwtPayload {
  userId: string;
  email: string;
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  let token: string | undefined = req.cookies?.jwt;

  if (!token) {
    const { authorization } = req.headers;
    if (authorization?.startsWith('Bearer ')) {
      token = authorization.split(' ')[1];
    }
  }

  if (!token) {
    next(new UnauthorizedError('No token provided'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.admin = { email: decoded.email, userId: decoded.userId };
    next();
  } catch {
    next(new UnauthorizedError('Invalid token'));
  }
}

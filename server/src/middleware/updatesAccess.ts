import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { UnauthorizedError } from '../utils/errors';

export async function updatesAccessMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const key = req.headers['x-ota-key'];

  if (typeof key !== 'string' || !key) {
    throw new UnauthorizedError('Missing x-ota-key header');
  }

  // Indexed O(1) lookup — index defined on User.otaApiKey
  const user = await User.findOne({ otaApiKey: key }).select('_id').lean();

  if (!user) {
    throw new UnauthorizedError('Invalid API key');
  }

  req.admin = { email: '', userId: user._id.toString() };
  next();
}

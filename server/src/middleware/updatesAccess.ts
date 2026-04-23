import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
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

  // First try user-level API key (backward compat)
  const user = await User.findOne({ otaApiKey: key }).select('_id').lean();
  if (user) {
    req.admin = { email: '', userId: user._id.toString() };
    return next();
  }

  // Fall back to per-project API key
  const project = await Project.findOne({ projectApiKey: key })
    .select('_id ownerId')
    .lean();
  if (!project) {
    throw new UnauthorizedError('Invalid API key');
  }

  req.admin = {
    email: '',
    userId: project.ownerId.toString(),
    projectId: project._id.toString(),
  };
  next();
}

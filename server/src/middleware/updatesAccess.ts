import { Request, Response, NextFunction } from 'express';
import { ProjectApiKey } from '../models/ProjectApiKey';
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

  const apiKey = await ProjectApiKey.findOne({ key })
    .select('_id ownerId projectId')
    .lean();

  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key');
  }

  req.admin = {
    email: '',
    userId: apiKey.ownerId.toString(),
    projectId: apiKey.projectId.toString(),
    projectApiKeyId: apiKey._id.toString(),
  };
  next();
}

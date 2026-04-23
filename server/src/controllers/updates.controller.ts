import { Request, Response } from 'express';
import { Bundle } from '../models/Bundle';
import { generateSignedUrl } from '../services/r2.service';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import type { IBundle } from '../models/Bundle';

function requireProjectContext(req: Request): string {
  if (!req.admin?.projectId) {
    throw new UnauthorizedError('Project scope missing for OTA request');
  }
  return req.admin.projectId;
}

async function buildUrlFields(
  bundle: Pick<
    IBundle,
    | 'androidBundleUrl'
    | 'iosBundleUrl'
    | 'androidBundleSha256'
    | 'iosBundleSha256'
  >,
) {
  return {
    downloadAndroidUrl: bundle.androidBundleUrl
      ? await generateSignedUrl(bundle.androidBundleUrl)
      : '',
    downloadIosUrl: bundle.iosBundleUrl
      ? await generateSignedUrl(bundle.iosBundleUrl)
      : '',
    sha256Android: bundle.androidBundleSha256 ?? '',
    sha256Ios: bundle.iosBundleSha256 ?? '',
  };
}

export async function getUpdateJson(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireProjectContext(req);
  const bundle = await Bundle.findOne({
    _id: req.params.id,
    ownerId: req.admin!.userId,
    projectId,
    status: 'released',
  }).lean();
  if (!bundle) throw new NotFoundError('Not found');
  res.json({
    version: bundle.bundleVersion,
    ...(await buildUrlFields(bundle)),
  });
}

export async function getLatestUpdate(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireProjectContext(req);
  const targetAppVersion =
    typeof req.query.targetAppVersion === 'string'
      ? req.query.targetAppVersion.trim()
      : undefined;

  const bundle = await Bundle.findOne({
    projectId,
    ownerId: req.admin!.userId,
    status: 'released',
    isActive: true,
    ...(targetAppVersion ? { targetAppVersion } : {}),
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
  if (!bundle) throw new NotFoundError('No active released bundle');

  res.json({
    version: bundle.bundleVersion,
    targetAppVersion: bundle.targetAppVersion,
    ...(await buildUrlFields(bundle)),
  });
}

export async function listBundles(req: Request, res: Response): Promise<void> {
  const projectId = requireProjectContext(req);
  const bundles = await Bundle.find({
    projectId,
    ownerId: req.admin!.userId,
    status: 'released',
  })
    .sort({ createdAt: -1 })
    .lean();

  const response = await Promise.all(
    bundles.map(async (bundle) => ({
      id: bundle._id,
      name: bundle.name,
      version: bundle.bundleVersion,
      targetAppVersion: bundle.targetAppVersion,
      ...(await buildUrlFields(bundle)),
      active: bundle.isActive,
    })),
  );
  res.json(response);
}

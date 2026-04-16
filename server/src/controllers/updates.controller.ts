import { Request, Response } from 'express';
import { BundleGroup } from '../models/BundleGroup';
import { generateSignedUrl } from '../services/r2.service';
import { NotFoundError } from '../utils/errors';
import type { IBundleGroup } from '../models/BundleGroup';

async function buildUrlFields(
  group: Pick<
    IBundleGroup,
    | 'androidBundleUrl'
    | 'iosBundleUrl'
    | 'androidBundleSha256'
    | 'iosBundleSha256'
  >,
) {
  return {
    downloadAndroidUrl: group.androidBundleUrl
      ? await generateSignedUrl(group.androidBundleUrl)
      : '',
    downloadIosUrl: group.iosBundleUrl
      ? await generateSignedUrl(group.iosBundleUrl)
      : '',
    sha256Android: group.androidBundleSha256 ?? '',
    sha256Ios: group.iosBundleSha256 ?? '',
  };
}

export async function getUpdateJson(
  req: Request,
  res: Response,
): Promise<void> {
  const group = await BundleGroup.findOne({
    _id: req.params.id,
    ownerId: req.admin!.userId,
  }).lean();
  if (!group) throw new NotFoundError('Not found');
  res.json({ version: group.version, ...(await buildUrlFields(group)) });
}

export async function getLatestUpdate(
  req: Request,
  res: Response,
): Promise<void> {
  const group = await BundleGroup.findOne({
    isActive: true,
    ownerId: req.admin!.userId,
  }).lean();
  if (!group) throw new NotFoundError('No active bundle group');
  res.json({ version: group.version, ...(await buildUrlFields(group)) });
}

export async function listBundles(req: Request, res: Response): Promise<void> {
  const groups = await BundleGroup.find({ ownerId: req.admin!.userId })
    .sort({ createdAt: -1 })
    .lean();
  const bundles = await Promise.all(
    groups.map(async (g) => ({
      id: g._id,
      name: g.name,
      version: g.version,
      ...(await buildUrlFields(g)),
      active: g.isActive,
    })),
  );
  res.json(bundles);
}

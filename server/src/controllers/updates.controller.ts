import { Request, Response } from 'express';
import { BundleGroup } from '../models/BundleGroup';
// Cloudflare/R2 fallback (kept for quick rollback):
// import { generateSignedUrl } from '../services/r2.service';
import { generateLocalUrl } from '../services/localStorage.service';
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
  baseUrl: string,
) {
  return {
    downloadAndroidUrl: group.androidBundleUrl
      ? generateLocalUrl(group.androidBundleUrl, baseUrl)
      : '',
    downloadIosUrl: group.iosBundleUrl
      ? generateLocalUrl(group.iosBundleUrl, baseUrl)
      : '',
    sha256Android: group.androidBundleSha256 ?? '',
    sha256Ios: group.iosBundleSha256 ?? '',
  };
}

function getRequestBaseUrl(req: Request): string {
  const forwardedProto = req.header('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol;
  const host = req.get('host') || '';
  return `${protocol}://${host}`;
}

export async function getUpdateJson(
  req: Request,
  res: Response,
): Promise<void> {
  const baseUrl = getRequestBaseUrl(req);
  const group = await BundleGroup.findOne({
    _id: req.params.id,
    ownerId: req.admin!.userId,
  }).lean();
  if (!group) throw new NotFoundError('Not found');
  res.json({
    version: group.version,
    ...(await buildUrlFields(group, baseUrl)),
  });
}

export async function getLatestUpdate(
  req: Request,
  res: Response,
): Promise<void> {
  const baseUrl = getRequestBaseUrl(req);
  const group = await BundleGroup.findOne({
    isActive: true,
    ownerId: req.admin!.userId,
  }).lean();
  if (!group) throw new NotFoundError('No active bundle group');
  res.json({
    version: group.version,
    ...(await buildUrlFields(group, baseUrl)),
  });
}

export async function listBundles(req: Request, res: Response): Promise<void> {
  const baseUrl = getRequestBaseUrl(req);
  const groups = await BundleGroup.find({ ownerId: req.admin!.userId })
    .sort({ createdAt: -1 })
    .lean();
  const bundles = await Promise.all(
    groups.map(async (g) => ({
      id: g._id,
      name: g.name,
      version: g.version,
      ...(await buildUrlFields(g, baseUrl)),
      active: g.isActive,
    })),
  );
  res.json(bundles);
}

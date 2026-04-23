import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { BundleGroup } from '../models/BundleGroup';
// Cloudflare/R2 fallback (kept for quick rollback):
// import { uploadToR2, deleteFromR2 } from '../services/r2.service';
import {
  uploadToLocal,
  deleteFromLocal,
} from '../services/localStorage.service';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function createGroup(req: Request, res: Response): Promise<void> {
  const { name, version } = req.body;

  if (!name || version === undefined)
    throw new ValidationError('name and version are required');

  const numericVersion = Number(version);
  if (!Number.isFinite(numericVersion))
    throw new ValidationError('version must be a valid number');

  const existing = await BundleGroup.findOne({
    version: numericVersion,
    ownerId: req.admin!.userId,
  });
  if (existing)
    throw new ConflictError(`Version ${numericVersion} already exists`);

  const group = await BundleGroup.create({
    name,
    version: numericVersion,
    ownerId: req.admin!.userId,
  });
  res.status(201).json(group);
}

export async function listGroups(req: Request, res: Response): Promise<void> {
  const groups = await BundleGroup.find({ ownerId: req.admin!.userId })
    .sort({ createdAt: -1 })
    .lean();
  res.json(groups);
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  const group = await BundleGroup.findOne({
    _id: req.params.id,
    ownerId: req.admin!.userId,
  }).lean();
  if (!group) throw new NotFoundError('Bundle group not found');
  res.json(group);
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  const { name, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;

  if (isActive === true) {
    await BundleGroup.updateMany(
      { ownerId: req.admin!.userId },
      { isActive: false },
    );
    update.isActive = true;
  } else if (isActive === false) {
    update.isActive = false;
  }

  const group = await BundleGroup.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.admin!.userId },
    update,
    { new: true },
  ).lean();
  if (!group) throw new NotFoundError('Bundle group not found');
  res.json(group);
}

export async function deleteGroup(req: Request, res: Response): Promise<void> {
  const group = await BundleGroup.findOne({
    _id: req.params.id,
    ownerId: req.admin!.userId,
  });
  if (!group) throw new NotFoundError('Bundle group not found');

  const prefix = `ota/${group.ownerId.toString()}/${group.version}`;
  // await deleteFromR2(`${prefix}/index.android.bundle.zip`);
  // await deleteFromR2(`${prefix}/main.jsbundle.zip`);
  await deleteFromLocal(`${prefix}/index.android.bundle.zip`);
  await deleteFromLocal(`${prefix}/main.jsbundle.zip`);

  await BundleGroup.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

export async function uploadFiles(req: Request, res: Response): Promise<void> {
  const group = await BundleGroup.findOne({
    _id: req.params.id,
    ownerId: req.admin!.userId,
  });
  if (!group) throw new NotFoundError('Bundle group not found');

  const files = req.files as
    | { [field: string]: Express.Multer.File[] }
    | undefined;
  if (!files) throw new ValidationError('No files uploaded');

  const prefix = `ota/${group.ownerId.toString()}/${group.version}`;

  if (files.androidBundle?.[0]) {
    const { buffer } = files.androidBundle[0];
    // group.androidBundleUrl = await uploadToR2(
    group.androidBundleUrl = await uploadToLocal(
      `${prefix}/index.android.bundle.zip`,
      buffer,
      'application/zip',
    );
    group.androidBundleSha256 = sha256Hex(buffer);
  }

  if (files.iosBundle?.[0]) {
    const { buffer } = files.iosBundle[0];
    // group.iosBundleUrl = await uploadToR2(
    group.iosBundleUrl = await uploadToLocal(
      `${prefix}/main.jsbundle.zip`,
      buffer,
      'application/zip',
    );
    group.iosBundleSha256 = sha256Hex(buffer);
  }

  await group.save();
  res.json(group);
}

import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { Bundle } from '../models/Bundle';
import { Project } from '../models/Project';
import {
  buildBundleArtifactKey,
  deleteFromR2,
  uploadToR2,
} from '../services/r2.service';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

async function getOwnedProject(projectId: string, ownerId: string) {
  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) throw new NotFoundError('Project not found');
  return project;
}

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value) {
    throw new ValidationError(`${name} is required`);
  }
  return value;
}

async function getOwnedBundle(
  projectId: string,
  bundleId: string,
  ownerId: string,
) {
  const bundle = await Bundle.findOne({ _id: bundleId, projectId, ownerId });
  if (!bundle) throw new NotFoundError('Bundle not found');
  return bundle;
}

function getEditablePayload(req: Request) {
  return {
    name: typeof req.body.name === 'string' ? req.body.name.trim() : undefined,
    title:
      typeof req.body.title === 'string' ? req.body.title.trim() : undefined,
    description:
      typeof req.body.description === 'string'
        ? req.body.description.trim()
        : undefined,
    targetAppVersion:
      typeof req.body.targetAppVersion === 'string'
        ? req.body.targetAppVersion.trim()
        : undefined,
    bundleVersion:
      typeof req.body.bundleVersion === 'string'
        ? req.body.bundleVersion.trim()
        : undefined,
  };
}

export async function listBundles(req: Request, res: Response): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  await getOwnedProject(projectId, req.admin!.userId);

  const bundles = await Bundle.find({
    projectId,
    ownerId: req.admin!.userId,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json(bundles);
}

export async function createBundle(req: Request, res: Response): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  await getOwnedProject(projectId, req.admin!.userId);

  const payload = getEditablePayload(req);
  if (!payload.name || !payload.targetAppVersion || !payload.bundleVersion) {
    throw new ValidationError(
      'name, targetAppVersion, and bundleVersion are required',
    );
  }

  const existing = await Bundle.findOne({
    projectId,
    ownerId: req.admin!.userId,
    bundleVersion: payload.bundleVersion,
  })
    .select('_id')
    .lean();
  if (existing) {
    throw new ConflictError('bundleVersion already exists in this project');
  }

  const bundle = await Bundle.create({
    projectId,
    ownerId: req.admin!.userId,
    name: payload.name,
    title: payload.title ?? '',
    description: payload.description ?? '',
    targetAppVersion: payload.targetAppVersion,
    bundleVersion: payload.bundleVersion,
  });

  res.status(201).json(bundle);
}

export async function getBundle(req: Request, res: Response): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const bundleId = requireParam(req.params.bundleId, 'bundleId');
  const bundle = await getOwnedBundle(projectId, bundleId, req.admin!.userId);
  res.json(bundle.toObject());
}

export async function updateBundle(req: Request, res: Response): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const bundleId = requireParam(req.params.bundleId, 'bundleId');
  const bundle = await getOwnedBundle(projectId, bundleId, req.admin!.userId);
  const payload = getEditablePayload(req);

  if (bundle.status === 'released') {
    if (
      payload.name !== undefined ||
      payload.targetAppVersion !== undefined ||
      payload.bundleVersion !== undefined
    ) {
      throw new ValidationError(
        'Released bundles only allow title and description updates',
      );
    }
  }

  if (payload.bundleVersion && payload.bundleVersion !== bundle.bundleVersion) {
    const existing = await Bundle.findOne({
      _id: { $ne: bundle._id },
      projectId: bundle.projectId,
      ownerId: req.admin!.userId,
      bundleVersion: payload.bundleVersion,
    })
      .select('_id')
      .lean();
    if (existing) {
      throw new ConflictError('bundleVersion already exists in this project');
    }
  }

  if (payload.name !== undefined) bundle.name = payload.name;
  if (payload.title !== undefined) bundle.title = payload.title;
  if (payload.description !== undefined)
    bundle.description = payload.description;
  if (payload.targetAppVersion !== undefined) {
    bundle.targetAppVersion = payload.targetAppVersion;
  }
  if (payload.bundleVersion !== undefined) {
    bundle.bundleVersion = payload.bundleVersion;
  }

  await bundle.save();
  res.json(bundle);
}

export async function deleteBundle(req: Request, res: Response): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const bundleId = requireParam(req.params.bundleId, 'bundleId');
  const bundle = await getOwnedBundle(projectId, bundleId, req.admin!.userId);

  if (bundle.status === 'released') {
    throw new ValidationError('Released bundles cannot be deleted');
  }

  await Promise.all(
    [bundle.androidBundleUrl, bundle.iosBundleUrl]
      .filter((value): value is string => Boolean(value))
      .map((key) => deleteFromR2(key)),
  );

  await Bundle.deleteOne({ _id: bundle._id });
  res.json({ success: true });
}

export async function uploadBundleFiles(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const bundleId = requireParam(req.params.bundleId, 'bundleId');
  const bundle = await getOwnedBundle(projectId, bundleId, req.admin!.userId);

  const files = req.files as
    | { [field: string]: Express.Multer.File[] }
    | undefined;
  if (!files) throw new ValidationError('No files uploaded');

  if (files.androidBundle?.[0]) {
    const { buffer } = files.androidBundle[0];
    bundle.androidBundleUrl = await uploadToR2(
      buildBundleArtifactKey(req.admin!.userId, projectId, bundleId, 'android'),
      buffer,
      'application/zip',
    );
    bundle.androidBundleSha256 = sha256Hex(buffer);
  }

  if (files.iosBundle?.[0]) {
    const { buffer } = files.iosBundle[0];
    bundle.iosBundleUrl = await uploadToR2(
      buildBundleArtifactKey(req.admin!.userId, projectId, bundleId, 'ios'),
      buffer,
      'application/zip',
    );
    bundle.iosBundleSha256 = sha256Hex(buffer);
  }

  await bundle.save();
  res.json(bundle);
}

export async function releaseBundle(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const bundleId = requireParam(req.params.bundleId, 'bundleId');
  const bundle = await getOwnedBundle(projectId, bundleId, req.admin!.userId);

  if (!bundle.androidBundleUrl && !bundle.iosBundleUrl) {
    throw new ValidationError(
      'Upload at least one platform bundle before release',
    );
  }

  if (bundle.status !== 'released') {
    bundle.status = 'released';

    const activePeer = await Bundle.findOne({
      _id: { $ne: bundle._id },
      projectId: bundle.projectId,
      ownerId: req.admin!.userId,
      targetAppVersion: bundle.targetAppVersion,
      status: 'released',
      isActive: true,
    })
      .select('_id')
      .lean();

    bundle.isActive = !activePeer;
    await bundle.save();
  }

  res.json(bundle);
}

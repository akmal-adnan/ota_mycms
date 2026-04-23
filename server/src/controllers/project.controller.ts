import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { BundleGroup } from '../models/BundleGroup';
import { uploadToR2, deleteFromR2 } from '../services/r2.service';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function generateProjectApiKey(): string {
  return randomBytes(32).toString('hex');
}

// ── Projects ──────────────────────────────────────

export async function listProjects(req: Request, res: Response): Promise<void> {
  const projects = await Project.find({ ownerId: req.admin!.userId })
    .sort({ createdAt: -1 })
    .lean();
  res.json(projects);
}

export async function createProject(
  req: Request,
  res: Response,
): Promise<void> {
  const { name } = req.body;
  if (!name) throw new ValidationError('name is required');

  const projectApiKey = generateProjectApiKey();
  const project = await Project.create({
    name,
    ownerId: req.admin!.userId,
    projectApiKey,
  });
  res.status(201).json(project);
}

export async function deleteProject(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  });
  if (!project) throw new NotFoundError('Project not found');

  // Delete all associated bundles and their R2 files
  const bundles = await BundleGroup.find({ projectId: project._id }).lean();
  await Promise.all(
    bundles.map(async (b) => {
      const prefix = `ota/${project.ownerId.toString()}/${b.version}`;
      await deleteFromR2(`${prefix}/index.android.bundle.zip`);
      await deleteFromR2(`${prefix}/main.jsbundle.zip`);
    }),
  );
  await BundleGroup.deleteMany({ projectId: project._id });
  await Project.findByIdAndDelete(project._id);

  res.json({ success: true });
}

// ── Project Bundles ───────────────────────────────

export async function listProjectBundles(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const bundles = await BundleGroup.find({ projectId: project._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json(bundles);
}

export async function createProjectBundle(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const { name, targetVersion } = req.body;
  if (!name) throw new ValidationError('name is required');

  // Auto-increment version within project scope
  const latest = await BundleGroup.findOne({ projectId: project._id })
    .sort({ version: -1 })
    .lean();
  const nextVersion = latest ? latest.version + 1 : 1;

  const existing = await BundleGroup.findOne({
    ownerId: req.admin!.userId,
    version: nextVersion,
    projectId: project._id,
  });
  if (existing) throw new ConflictError('Bundle version conflict');

  const bundle = await BundleGroup.create({
    name,
    version: nextVersion,
    ownerId: req.admin!.userId,
    projectId: project._id,
    targetVersion: targetVersion ?? null,
  });
  res.status(201).json(bundle);
}

export async function updateProjectBundle(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const { name, targetVersion, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (targetVersion !== undefined) update.targetVersion = targetVersion;

  if (isActive === true) {
    await BundleGroup.updateMany(
      { ownerId: req.admin!.userId, projectId: project._id },
      { isActive: false },
    );
    update.isActive = true;
  } else if (isActive === false) {
    update.isActive = false;
  }

  const bundle = await BundleGroup.findOneAndUpdate(
    { _id: req.params.bundleId, projectId: project._id },
    update,
    { new: true },
  ).lean();
  if (!bundle) throw new NotFoundError('Bundle not found');
  res.json(bundle);
}

export async function deleteProjectBundle(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const bundle = await BundleGroup.findOne({
    _id: req.params.bundleId,
    projectId: project._id,
  });
  if (!bundle) throw new NotFoundError('Bundle not found');

  const prefix = `ota/${project.ownerId.toString()}/${bundle.version}`;
  await deleteFromR2(`${prefix}/index.android.bundle.zip`);
  await deleteFromR2(`${prefix}/main.jsbundle.zip`);

  await BundleGroup.findByIdAndDelete(bundle._id);
  res.json({ success: true });
}

export async function uploadProjectBundleFiles(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const bundle = await BundleGroup.findOne({
    _id: req.params.bundleId,
    projectId: project._id,
  });
  if (!bundle) throw new NotFoundError('Bundle not found');

  const files = req.files as
    | { [field: string]: Express.Multer.File[] }
    | undefined;
  if (!files) throw new ValidationError('No files uploaded');

  const prefix = `ota/${project.ownerId.toString()}/${bundle.version}`;

  if (files.androidBundle?.[0]) {
    const { buffer } = files.androidBundle[0];
    bundle.androidBundleUrl = await uploadToR2(
      `${prefix}/index.android.bundle.zip`,
      buffer,
      'application/zip',
    );
    bundle.androidBundleSha256 = sha256Hex(buffer);
  }

  if (files.iosBundle?.[0]) {
    const { buffer } = files.iosBundle[0];
    bundle.iosBundleUrl = await uploadToR2(
      `${prefix}/main.jsbundle.zip`,
      buffer,
      'application/zip',
    );
    bundle.iosBundleSha256 = sha256Hex(buffer);
  }

  await bundle.save();
  res.json(bundle);
}

export async function releaseProjectBundle(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const bundle = await BundleGroup.findOneAndUpdate(
    { _id: req.params.bundleId, projectId: project._id },
    { isReleased: true, releasedAt: new Date() },
    { new: true },
  ).lean();
  if (!bundle) throw new NotFoundError('Bundle not found');
  res.json(bundle);
}

export async function listProjectReleases(
  req: Request,
  res: Response,
): Promise<void> {
  const project = await Project.findOne({
    _id: req.params.projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!project) throw new NotFoundError('Project not found');

  const released = await BundleGroup.find({
    projectId: project._id,
    isReleased: true,
  })
    .sort({ releasedAt: -1 })
    .lean();

  res.json(released);
}

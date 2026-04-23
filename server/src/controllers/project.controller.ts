import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Bundle } from '../models/Bundle';
import { Project } from '../models/Project';
import { ProjectApiKey } from '../models/ProjectApiKey';
import { deleteFromR2 } from '../services/r2.service';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

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

export async function listProjects(req: Request, res: Response): Promise<void> {
  const ownerId = req.admin!.userId;
  const [projects, bundleCounts] = await Promise.all([
    Project.find({ ownerId }).sort({ createdAt: -1 }).lean(),
    Bundle.aggregate<{ _id: string; bundleCount: number }>([
      { $match: { ownerId: new Types.ObjectId(ownerId) } },
      { $group: { _id: '$projectId', bundleCount: { $sum: 1 } } },
    ]),
  ]);

  const bundleCountsByProject = new Map(
    bundleCounts.map((entry) => [String(entry._id), entry.bundleCount]),
  );

  res.json(
    projects.map((project) => ({
      ...project,
      bundleCount: bundleCountsByProject.get(String(project._id)) ?? 0,
    })),
  );
}

export async function createProject(
  req: Request,
  res: Response,
): Promise<void> {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) throw new ValidationError('name is required');

  const existing = await Project.findOne({ name, ownerId: req.admin!.userId })
    .select('_id')
    .lean();
  if (existing) throw new ConflictError('Project name already exists');

  const project = await Project.create({ name, ownerId: req.admin!.userId });
  res.status(201).json(project);
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const project = await getOwnedProject(projectId, req.admin!.userId);
  const apiKeys = await ProjectApiKey.find({
    projectId: project._id,
    ownerId: req.admin!.userId,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    ...project.toObject(),
    apiKeys: apiKeys.map((apiKey) => ({
      _id: apiKey._id,
      label: apiKey.label,
      key: apiKey.key,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    })),
  });
}

export async function updateProject(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const project = await getOwnedProject(projectId, req.admin!.userId);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) throw new ValidationError('name is required');

  const existing = await Project.findOne({
    _id: { $ne: project._id },
    ownerId: req.admin!.userId,
    name,
  })
    .select('_id')
    .lean();
  if (existing) throw new ConflictError('Project name already exists');

  project.name = name;
  await project.save();
  res.json(project);
}

export async function deleteProject(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const project = await getOwnedProject(projectId, req.admin!.userId);
  const bundles = await Bundle.find({
    projectId: project._id,
    ownerId: req.admin!.userId,
  })
    .select('androidBundleUrl iosBundleUrl')
    .lean();

  await Promise.all(
    bundles.flatMap((bundle) =>
      [bundle.androidBundleUrl, bundle.iosBundleUrl]
        .filter((value): value is string => Boolean(value))
        .map((key) => deleteFromR2(key)),
    ),
  );

  await Promise.all([
    Bundle.deleteMany({ projectId: project._id, ownerId: req.admin!.userId }),
    ProjectApiKey.deleteMany({
      projectId: project._id,
      ownerId: req.admin!.userId,
    }),
    Project.deleteOne({ _id: project._id, ownerId: req.admin!.userId }),
  ]);

  res.json({ success: true });
}

export async function listProjectApiKeys(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const project = await getOwnedProject(projectId, req.admin!.userId);
  const apiKeys = await ProjectApiKey.find({
    projectId: project._id,
    ownerId: req.admin!.userId,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json(
    apiKeys.map((apiKey) => ({
      _id: apiKey._id,
      label: apiKey.label,
      key: apiKey.key,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    })),
  );
}

export async function addProjectApiKey(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const project = await getOwnedProject(projectId, req.admin!.userId);
  const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
  if (!label) throw new ValidationError('label is required');

  const apiKey = await ProjectApiKey.create({
    projectId: project._id,
    ownerId: req.admin!.userId,
    key: randomBytes(32).toString('hex'),
    label,
  });

  res.status(201).json({
    apiKey: {
      _id: apiKey._id,
      label: apiKey.label,
      key: apiKey.key,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    },
  });
}

export async function removeProjectApiKey(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const keyId = requireParam(req.params.keyId, 'keyId');
  await getOwnedProject(projectId, req.admin!.userId);

  const apiKey = await ProjectApiKey.findOneAndDelete({
    _id: keyId,
    projectId,
    ownerId: req.admin!.userId,
  }).lean();
  if (!apiKey) throw new NotFoundError('Project API key not found');

  res.json({ success: true });
}

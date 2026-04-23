import { Request, Response } from 'express';
import { Bundle } from '../models/Bundle';
import { Project } from '../models/Project';
import { NotFoundError, ValidationError } from '../utils/errors';

async function assertOwnedProject(projectId: string, ownerId: string) {
  const project = await Project.findOne({ _id: projectId, ownerId })
    .select('_id')
    .lean();
  if (!project) throw new NotFoundError('Project not found');
}

function requireParam(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value) {
    throw new ValidationError(`${name} is required`);
  }
  return value;
}

export async function listReleaseGroups(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  await assertOwnedProject(projectId, req.admin!.userId);

  const bundles = await Bundle.find({
    projectId,
    ownerId: req.admin!.userId,
    status: 'released',
  })
    .sort({ targetAppVersion: 1, createdAt: -1 })
    .lean();

  const groups = bundles.reduce<Record<string, typeof bundles>>(
    (acc, bundle) => {
      const key = bundle.targetAppVersion;
      acc[key] ??= [];
      acc[key].push(bundle);
      return acc;
    },
    {},
  );

  res.json(
    Object.entries(groups).map(([targetAppVersion, groupedBundles]) => ({
      targetAppVersion,
      bundles: groupedBundles,
    })),
  );
}

export async function getReleaseGroup(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const targetAppVersion = requireParam(
    req.params.targetAppVersion,
    'targetAppVersion',
  );
  await assertOwnedProject(projectId, req.admin!.userId);

  const bundles = await Bundle.find({
    projectId,
    ownerId: req.admin!.userId,
    status: 'released',
    targetAppVersion,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (bundles.length === 0) {
    throw new NotFoundError('Release group not found');
  }

  res.json({
    targetAppVersion,
    bundles,
  });
}

export async function toggleReleaseBundle(
  req: Request,
  res: Response,
): Promise<void> {
  const projectId = requireParam(req.params.projectId, 'projectId');
  const bundleId = requireParam(req.params.bundleId, 'bundleId');
  await assertOwnedProject(projectId, req.admin!.userId);

  if (typeof req.body.isActive !== 'boolean') {
    throw new ValidationError('isActive must be a boolean');
  }

  const bundle = await Bundle.findOne({
    _id: bundleId,
    projectId,
    ownerId: req.admin!.userId,
    status: 'released',
  });
  if (!bundle) throw new NotFoundError('Released bundle not found');

  if (req.body.isActive) {
    await Bundle.updateMany(
      {
        projectId: bundle.projectId,
        ownerId: req.admin!.userId,
        targetAppVersion: bundle.targetAppVersion,
        status: 'released',
      },
      { isActive: false },
    );
    bundle.isActive = true;
  } else {
    bundle.isActive = false;
  }

  await bundle.save();
  res.json(bundle);
}

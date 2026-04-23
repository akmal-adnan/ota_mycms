import mongoose, { Types } from 'mongoose';
import { CopyObjectCommand } from '@aws-sdk/client-s3';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { r2Client } from '../config/r2';
import { Bundle } from '../models/Bundle';
import { BundleGroup } from '../models/BundleGroup';
import { Project } from '../models/Project';
import { ProjectApiKey } from '../models/ProjectApiKey';
import { User } from '../models/User';
import { buildBundleArtifactKey } from '../services/r2.service';

type BundleField = 'androidBundleUrl' | 'iosBundleUrl';

const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_PROJECT_NAME = 'Migrated Project';
const DEFAULT_KEY_LABEL = 'migrated-primary';

function toCopySource(key: string): string {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  return `${env.R2_BUCKET_NAME}/${encodedKey}`;
}

async function copyKeyIfNeeded(fromKey: string, toKey: string): Promise<void> {
  if (fromKey === toKey) {
    return;
  }

  await r2Client.send(
    new CopyObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      CopySource: toCopySource(fromKey),
      Key: toKey,
      MetadataDirective: 'COPY',
    }),
  );
}

function getDestinationKeys(
  ownerId: string,
  projectId: string,
  bundleId: string,
): Record<BundleField, string> {
  return {
    androidBundleUrl: buildBundleArtifactKey(
      ownerId,
      projectId,
      bundleId,
      'android',
    ),
    iosBundleUrl: buildBundleArtifactKey(ownerId, projectId, bundleId, 'ios'),
  };
}

async function ensureProject(ownerId: string) {
  let project = await Project.findOne({ ownerId, name: DEFAULT_PROJECT_NAME });
  let created = false;

  if (!project && !DRY_RUN) {
    project = await Project.create({ ownerId, name: DEFAULT_PROJECT_NAME });
    created = true;
  }

  return {
    project,
    created,
    projectIdForPlanning:
      project?._id.toString() ?? new Types.ObjectId().toString(),
  };
}

async function ensureProjectApiKey(
  projectId: string,
  ownerId: string,
  legacyKey: string | null | undefined,
  createdAt: Date | null | undefined,
): Promise<boolean> {
  if (!legacyKey) {
    return false;
  }

  const existing = await ProjectApiKey.findOne({ key: legacyKey })
    .select('_id')
    .lean();
  if (existing || DRY_RUN) {
    return !existing;
  }

  await ProjectApiKey.create({
    projectId,
    ownerId,
    key: legacyKey,
    label: DEFAULT_KEY_LABEL,
    createdAt: createdAt ?? new Date(),
    updatedAt: createdAt ?? new Date(),
  });
  return true;
}

async function ensureBundle(
  group: InstanceType<typeof BundleGroup>,
  projectId: string,
) {
  const ownerId = group.ownerId.toString();
  const bundleVersion = String(group.version);

  let bundle = await Bundle.findOne({ projectId, ownerId, bundleVersion });
  let created = false;

  if (!bundle && !DRY_RUN) {
    bundle = await Bundle.create({
      projectId,
      ownerId,
      name: group.name,
      title: group.name,
      description: '',
      targetAppVersion: bundleVersion,
      bundleVersion,
      status: 'released',
      isActive: group.isActive,
    });
    created = true;
  }

  return {
    bundle,
    created,
    bundleIdForPlanning:
      bundle?._id.toString() ?? new Types.ObjectId().toString(),
  };
}

async function run(): Promise<void> {
  let scannedUsers = 0;
  let projectsCreated = 0;
  let projectKeysCreated = 0;
  let groupsScanned = 0;
  let bundlesCreated = 0;
  let bundlesUpdated = 0;
  let objectsCopied = 0;
  let groupsWithoutFiles = 0;

  await connectDB();

  try {
    const users = await User.find()
      .select('_id otaApiKey otaApiKeyCreatedAt')
      .lean();

    for (const user of users) {
      scannedUsers += 1;

      const ownerId = user._id.toString();
      const { project, created, projectIdForPlanning } =
        await ensureProject(ownerId);
      if (created) {
        projectsCreated += 1;
      }

      if (
        await ensureProjectApiKey(
          projectIdForPlanning,
          ownerId,
          user.otaApiKey,
          user.otaApiKeyCreatedAt,
        )
      ) {
        projectKeysCreated += 1;
      }

      const groups = await BundleGroup.find({ ownerId });

      for (const group of groups) {
        groupsScanned += 1;

        const {
          bundle,
          created: bundleCreated,
          bundleIdForPlanning,
        } = await ensureBundle(group, projectIdForPlanning);
        if (bundleCreated) {
          bundlesCreated += 1;
        }

        const destinationKeys = getDestinationKeys(
          ownerId,
          projectIdForPlanning,
          bundleIdForPlanning,
        );

        const updates: Partial<Record<BundleField, string | null>> & {
          name?: string;
          title?: string;
          targetAppVersion?: string;
          bundleVersion?: string;
          status?: 'released';
          isActive?: boolean;
          androidBundleSha256?: string | null;
          iosBundleSha256?: string | null;
        } = {
          name: group.name,
          title: group.name,
          targetAppVersion: String(group.version),
          bundleVersion: String(group.version),
          status: 'released',
          isActive: group.isActive,
          androidBundleSha256: group.androidBundleSha256,
          iosBundleSha256: group.iosBundleSha256,
        };

        const fields: BundleField[] = ['androidBundleUrl', 'iosBundleUrl'];
        let hasAnyFile = false;

        for (const field of fields) {
          const currentKey = group[field];
          if (!currentKey) {
            updates[field] = null;
            continue;
          }

          hasAnyFile = true;
          const destinationKey = destinationKeys[field];
          updates[field] = destinationKey;

          if (!DRY_RUN) {
            await copyKeyIfNeeded(currentKey, destinationKey);
          }
          if (currentKey !== destinationKey) {
            objectsCopied += 1;
          }
        }

        if (!hasAnyFile) {
          groupsWithoutFiles += 1;
        }

        if (DRY_RUN) {
          console.log(
            `[dry-run] owner=${ownerId} group=${group._id.toString()} project=${projectIdForPlanning} bundle=${bundleIdForPlanning}`,
          );
          continue;
        }

        if (!bundle) {
          throw new Error(
            `Bundle creation failed for legacy group ${group._id.toString()}`,
          );
        }

        Object.assign(bundle, updates);
        await bundle.save();
        if (!bundleCreated) {
          bundlesUpdated += 1;
        }
      }
    }

    console.log('Project refactor migration complete');
    console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
    console.log(`Users scanned: ${scannedUsers}`);
    console.log(`Projects created: ${projectsCreated}`);
    console.log(`Project API keys created: ${projectKeysCreated}`);
    console.log(`Legacy bundle groups scanned: ${groupsScanned}`);
    console.log(`Bundles created: ${bundlesCreated}`);
    console.log(`Bundles updated: ${bundlesUpdated}`);
    console.log(`R2 objects copied: ${objectsCopied}`);
    console.log(`Groups without files: ${groupsWithoutFiles}`);
    if (DRY_RUN) {
      console.log('No database records or R2 objects were modified.');
    } else {
      console.log(
        'Legacy bundle-group records were preserved; new project/bundle records now own the copied R2 keys.',
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Project refactor migration failed:', error);
  process.exit(1);
});

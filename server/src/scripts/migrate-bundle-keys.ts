import mongoose from 'mongoose';
import { CopyObjectCommand } from '@aws-sdk/client-s3';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { r2Client } from '../config/r2';
import { BundleGroup } from '../models/BundleGroup';

type BundleField = 'androidBundleUrl' | 'iosBundleUrl';

const DRY_RUN = process.argv.includes('--dry-run');

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

function getExpectedKeys(
  ownerId: string,
  version: number,
): Record<BundleField, string> {
  return {
    androidBundleUrl: `ota/${ownerId}/${version}/index.android.bundle.zip`,
    iosBundleUrl: `ota/${ownerId}/${version}/main.jsbundle.zip`,
  };
}

function getLegacyKeys(version: number): Record<BundleField, string> {
  return {
    androidBundleUrl: `ota/${version}/index.android.bundle.zip`,
    iosBundleUrl: `ota/${version}/main.jsbundle.zip`,
  };
}

async function run(): Promise<void> {
  let scanned = 0;
  let groupsWithChanges = 0;
  let copiedObjects = 0;
  let updatedGroups = 0;
  let skippedUnexpectedKeys = 0;

  await connectDB();

  try {
    const cursor = BundleGroup.find()
      .select('_id ownerId version androidBundleUrl iosBundleUrl')
      .cursor();

    for await (const group of cursor) {
      scanned += 1;

      const ownerId = group.ownerId.toString();
      const expected = getExpectedKeys(ownerId, group.version);
      const legacy = getLegacyKeys(group.version);
      const updates: Partial<Record<BundleField, string>> = {};

      const fields: BundleField[] = ['androidBundleUrl', 'iosBundleUrl'];

      for (const field of fields) {
        const currentKey = group[field];
        if (!currentKey) {
          continue;
        }

        if (currentKey === expected[field]) {
          continue;
        }

        if (currentKey !== legacy[field]) {
          skippedUnexpectedKeys += 1;
          console.warn(
            `[skip] Group ${group._id.toString()} has unexpected key in ${field}: ${currentKey}`,
          );
          continue;
        }

        groupsWithChanges += 1;

        if (DRY_RUN) {
          console.log(
            `[dry-run] ${group._id.toString()} ${field}: ${currentKey} -> ${expected[field]}`,
          );
          updates[field] = expected[field];
          continue;
        }

        await copyKeyIfNeeded(currentKey, expected[field]);
        copiedObjects += 1;
        updates[field] = expected[field];
      }

      if (Object.keys(updates).length > 0 && !DRY_RUN) {
        await BundleGroup.updateOne({ _id: group._id }, { $set: updates });
        updatedGroups += 1;
      }
    }

    console.log('Bundle key migration complete');
    console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
    console.log(`Groups scanned: ${scanned}`);
    console.log(`Groups requiring changes: ${groupsWithChanges}`);
    console.log(`Objects copied: ${copiedObjects}`);
    console.log(`Groups updated: ${updatedGroups}`);
    console.log(`Unexpected keys skipped: ${skippedUnexpectedKeys}`);
    if (DRY_RUN) {
      console.log('No objects or database records were modified.');
    } else {
      console.log(
        'Legacy objects were copied to owner-scoped keys; old objects were not deleted.',
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Bundle key migration failed:', error);
  process.exit(1);
});

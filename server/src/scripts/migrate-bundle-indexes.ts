import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { BundleGroup } from '../models/BundleGroup';

async function run(): Promise<void> {
  await connectDB();

  try {
    const before = await BundleGroup.collection.indexes();
    console.log('Current indexes:');
    console.log(JSON.stringify(before, null, 2));

    // Sync collection indexes to match current schema definition.
    // This drops legacy global version uniqueness and creates ownerId+version uniqueness.
    const dropped = await BundleGroup.syncIndexes();

    if (dropped.length > 0) {
      console.log(`Dropped indexes: ${dropped.join(', ')}`);
    } else {
      console.log('No obsolete indexes were dropped.');
    }

    const after = await BundleGroup.collection.indexes();
    console.log('Indexes after sync:');
    console.log(JSON.stringify(after, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Bundle index migration failed:', error);
  process.exit(1);
});

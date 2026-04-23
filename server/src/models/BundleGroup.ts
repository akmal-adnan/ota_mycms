import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBundleGroup extends Document {
  name: string;
  version: number;
  ownerId: Types.ObjectId;
  projectId: Types.ObjectId | null;
  targetVersion: string | null;
  androidBundleUrl: string | null;
  iosBundleUrl: string | null;
  androidBundleSha256: string | null;
  iosBundleSha256: string | null;
  isActive: boolean;
  isReleased: boolean;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BundleGroupSchema = new Schema<IBundleGroup>(
  {
    name: { type: String, required: true, trim: true },
    version: { type: Number, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    targetVersion: { type: String, default: null, trim: true },
    androidBundleUrl: { type: String, default: null },
    iosBundleUrl: { type: String, default: null },
    androidBundleSha256: { type: String, default: null },
    iosBundleSha256: { type: String, default: null },
    isActive: { type: Boolean, default: false },
    isReleased: { type: Boolean, default: false },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

BundleGroupSchema.index({ ownerId: 1, version: 1 }, { unique: true });
BundleGroupSchema.index({ projectId: 1 });
BundleGroupSchema.index({ projectId: 1, isReleased: 1 });

export const BundleGroup = mongoose.model<IBundleGroup>(
  'BundleGroup',
  BundleGroupSchema,
);

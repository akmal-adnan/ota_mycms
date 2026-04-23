import mongoose, { Document, Schema, Types } from 'mongoose';

export type BundleStatus = 'draft' | 'released';

export interface IBundle extends Document {
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  title: string;
  description: string;
  targetAppVersion: string;
  bundleVersion: string;
  androidBundleUrl: string | null;
  iosBundleUrl: string | null;
  androidBundleSha256: string | null;
  iosBundleSha256: string | null;
  status: BundleStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BundleSchema = new Schema<IBundle>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    targetAppVersion: { type: String, required: true, trim: true },
    bundleVersion: { type: String, required: true, trim: true },
    androidBundleUrl: { type: String, default: null },
    iosBundleUrl: { type: String, default: null },
    androidBundleSha256: { type: String, default: null },
    iosBundleSha256: { type: String, default: null },
    status: {
      type: String,
      enum: ['draft', 'released'],
      default: 'draft',
    },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BundleSchema.index({ projectId: 1, bundleVersion: 1 }, { unique: true });
BundleSchema.index({ projectId: 1, status: 1 });
BundleSchema.index({ projectId: 1, targetAppVersion: 1 });
BundleSchema.index(
  { projectId: 1, targetAppVersion: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true, status: 'released' },
  },
);

export const Bundle = mongoose.model<IBundle>('Bundle', BundleSchema);

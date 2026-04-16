import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBundleGroup extends Document {
  name: string;
  version: number;
  ownerId: Types.ObjectId;
  androidBundleUrl: string | null;
  iosBundleUrl: string | null;
  androidBundleSha256: string | null;
  iosBundleSha256: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BundleGroupSchema = new Schema<IBundleGroup>(
  {
    name: { type: String, required: true, trim: true },
    version: { type: Number, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    androidBundleUrl: { type: String, default: null },
    iosBundleUrl: { type: String, default: null },
    androidBundleSha256: { type: String, default: null },
    iosBundleSha256: { type: String, default: null },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BundleGroupSchema.index({ ownerId: 1, version: 1 }, { unique: true });

export const BundleGroup = mongoose.model<IBundleGroup>(
  'BundleGroup',
  BundleGroupSchema,
);

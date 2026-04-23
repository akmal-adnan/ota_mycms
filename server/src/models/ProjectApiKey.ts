import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProjectApiKey extends Document {
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  key: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectApiKeySchema = new Schema<IProjectApiKey>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

ProjectApiKeySchema.index({ projectId: 1, createdAt: -1 });

export const ProjectApiKey = mongoose.model<IProjectApiKey>(
  'ProjectApiKey',
  ProjectApiKeySchema,
);

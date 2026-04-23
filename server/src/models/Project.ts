import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProject extends Document {
  name: string;
  ownerId: Types.ObjectId;
  projectApiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectApiKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ projectApiKey: 1 }, { unique: true });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

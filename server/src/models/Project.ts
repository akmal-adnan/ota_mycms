import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProject extends Document {
  name: string;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

ProjectSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

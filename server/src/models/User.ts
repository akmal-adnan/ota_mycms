import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  otaApiKey?: string | null;
  otaApiKeyCreatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    otaApiKey: { type: String, default: null },
    otaApiKeyCreatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.index(
  { otaApiKey: 1 },
  { unique: true, partialFilterExpression: { otaApiKey: { $type: 'string' } } },
);

export const User = mongoose.model<IUser>('User', UserSchema);

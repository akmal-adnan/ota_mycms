import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  otaApiKey: string;
  otaApiKeyCreatedAt: Date;
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
    otaApiKey: { type: String, required: true },
    otaApiKeyCreatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

UserSchema.index({ otaApiKey: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);

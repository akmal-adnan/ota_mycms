import dotenv from 'dotenv';
dotenv.config();

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const _env = {
  PORT: parseInt(optionalEnv('PORT', '3001'), 10),
  MONGO_URI: requireEnv('MONGO_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  R2_ACCOUNT_ID: requireEnv('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: requireEnv('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: requireEnv('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: requireEnv('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: optionalEnv('R2_PUBLIC_URL', ''),
  ALLOWED_ORIGINS: optionalEnv('ALLOWED_ORIGINS', ''),
};

export const env: DeepReadonly<typeof _env> = _env;

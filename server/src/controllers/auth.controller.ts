import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';

const COOKIE_NAME = 'jwt';
const JWT_EXPIRY = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ValidationError('Email and password are required');
  if (typeof password !== 'string' || password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  const normalizedEmail = (email as string).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing)
    throw new ConflictError('An account with this email already exists');

  const hashedPassword = await bcrypt.hash(password as string, 10);
  const otaApiKey = randomBytes(32).toString('hex');

  const user = await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    otaApiKey,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

  setAuthCookie(res, token);
  res.status(201).json({ email: user.email, otaApiKey });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ValidationError('Email and password are required');

  const user = await User.findOne({
    email: (email as string).toLowerCase().trim(),
  });
  if (!user || !(await bcrypt.compare(password as string, user.password))) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

  setAuthCookie(res, token);
  res.json({ email: user.email });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ email: req.admin?.email, userId: req.admin?.userId });
}

export async function getApiKey(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.admin?.userId).select(
    'otaApiKey otaApiKeyCreatedAt',
  );
  if (!user) throw new NotFoundError('User not found');

  res.json({
    keyPreview: user.otaApiKey,
    createdAt: user.otaApiKeyCreatedAt,
  });
}

export async function regenerateApiKey(
  req: Request,
  res: Response,
): Promise<void> {
  const newKey = randomBytes(32).toString('hex');
  const user = await User.findByIdAndUpdate(
    req.admin?.userId,
    { otaApiKey: newKey, otaApiKeyCreatedAt: new Date() },
    { new: true },
  );
  if (!user) throw new NotFoundError('User not found');

  res.json({ otaApiKey: newKey, createdAt: user.otaApiKeyCreatedAt });
}

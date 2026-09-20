import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.config';
import { RoleName } from '@prisma/client';

export interface JwtAccessPayload {
  userId: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
}

export interface JwtRefreshPayload {
  userId: string;
  tokenId: string; // Database RefreshToken ID for tracking & revocation
  family: string;  // Token family UUID for reuse detection
}

export function generateAccessToken(payload: JwtAccessPayload): string {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRATION as any
  });
}

export function generateRefreshToken(payload: JwtRefreshPayload): string {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRATION as any
  });
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as JwtRefreshPayload;
}

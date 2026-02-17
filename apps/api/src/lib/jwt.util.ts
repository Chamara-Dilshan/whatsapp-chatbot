import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '@whatsapp-bot/shared';

/**
 * Access token: 15 minutes (short-lived for production security).
 * Refresh token: 7 days (used to obtain new access tokens).
 *
 * Falls back to 24h access token if JWT_REFRESH_SECRET is not set
 * (backward-compatible for development).
 */
const ACCESS_TOKEN_EXPIRY = env.JWT_REFRESH_SECRET ? '15m' : '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// ── Access Tokens ─────────────────────────────────────────────────────

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// Alias used throughout the codebase
export const signAccessToken = signToken;

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

// ── Refresh Tokens ────────────────────────────────────────────────────

export function signRefreshToken(payload: JwtPayload): string {
  const secret = env.JWT_REFRESH_SECRET || env.JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = env.JWT_REFRESH_SECRET || env.JWT_SECRET;
  return jwt.verify(token, secret) as JwtPayload;
}

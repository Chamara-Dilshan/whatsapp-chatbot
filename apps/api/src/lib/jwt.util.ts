import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '@whatsapp-bot/shared';

const JWT_EXPIRY = '24h';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

import { createHmac } from 'crypto';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Read JWT_SECRET from API .env without needing dotenv package
function readEnvVar(key: string): string {
  const envPath = join(__dirname, '../apps/api/.env');
  const contents = readFileSync(envPath, 'utf-8');
  const match = contents.match(new RegExp(`^${key}=(.+)$`, 'm'));
  if (!match) throw new Error(`${key} not found in apps/api/.env`);
  return match[1].trim();
}

function base64url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function signJWT(payload: object, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h
    })
  );
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${header}.${body}.${sig}`;
}

async function globalSetup() {
  const jwtSecret = readEnvVar('JWT_SECRET');

  // Known demo user IDs from seed data
  const ownerToken = signJWT(
    { userId: 'cmlqs2ktr0001bvh9yssjlemf', tenantId: 'tenant_demo_001', role: 'owner' },
    jwtSecret
  );

  const agentToken = signJWT(
    { userId: 'cmlqs2l3l0003bvh98nkfa2rs', tenantId: 'tenant_demo_001', role: 'agent' },
    jwtSecret
  );

  writeFileSync(
    join(__dirname, '.auth-tokens.json'),
    JSON.stringify({ ownerToken, agentToken }, null, 2)
  );

  console.log('[global-setup] JWT tokens generated for owner and agent (no API calls)');
}

export default globalSetup;

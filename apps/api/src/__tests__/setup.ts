import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';

// Wipe all tenant-owned data before every test file runs.
// TRUNCATE "Tenant" CASCADE removes all FK-linked rows in one shot.
beforeAll(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "Tenant" CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  AGENT: 'agent',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

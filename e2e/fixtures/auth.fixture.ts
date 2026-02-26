import { test as base, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TokenCache {
  ownerToken: string;
  agentToken: string;
}

function readTokenCache(): TokenCache {
  const path = join(__dirname, '../.auth-tokens.json');
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    throw new Error(
      'Auth token cache not found. Ensure globalSetup ran and servers are up.'
    );
  }
}

// Known demo user data matching seed data
const OWNER_USER = {
  id: 'cmlqs2ktr0001bvh9yssjlemf',
  email: 'owner@acme.test',
  name: 'Acme Owner',
  role: 'owner',
  tenantId: 'tenant_demo_001',
};

const AGENT_USER = {
  id: 'cmlqs2l3l0003bvh98nkfa2rs',
  email: 'agent@acme.test',
  name: 'Acme Agent',
  role: 'agent',
  tenantId: 'tenant_demo_001',
};

// Shared mock data constants
const PRO_LIMITS = {
  plan: 'pro',
  maxAgents: 3,
  maxInboundPerMonth: 500,
  maxOutboundPerDay: 1000,
  maxProducts: null,
  automationEnabled: true,
  analyticsEnabled: true,
  aiEnabled: true,
  maxAiCallsPerMonth: 1000,
};

/**
 * Set up an authenticated page without hitting the rate-limited API endpoints.
 *
 * Strategy:
 * 1. page.addInitScript — injects the JWT into localStorage before React hydrates
 *    on every navigation, so AuthContext finds the token on first mount.
 * 2. page.route on /auth/me — fulfils the request locally so the 100 req/min
 *    tenantId rate-limiter is never consumed by the auth check.
 * 3. page.route on all high-volume dashboard endpoints — eliminates ~95% of real
 *    API calls so the 100 req/min budget is never exceeded across 84 tests.
 */
async function setupAuthenticatedPage(
  page: Page,
  token: string,
  user: typeof OWNER_USER
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { user } }),
    });
  });

  // ── Analytics (4 endpoints, each hit once per test navigating to /analytics)
  await page.route('**/analytics/overview**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalConversations: 0, activeConversations: 0, totalCases: 0,
          openCases: 0, avgResponseTime: 0, slaBreaches: 0,
        },
      }),
    });
  });

  await page.route('**/analytics/intents**', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route('**/analytics/agents**', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route('**/analytics/sla**', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // ── Billing (raw fetch, not api.request — response NOT wrapped in success/data)
  await page.route('**/billing/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscription: {
          plan: 'pro',
          status: 'active',
          currentPeriodStart: '2026-02-01T00:00:00.000Z',
          currentPeriodEnd: '2026-03-01T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
        limits: PRO_LIMITS,
      }),
    });
  });

  await page.route('**/billing/usage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          inboundMessagesCount: 0,
          outboundMessagesCount: 0,
          automationEventsCount: 0,
          aiCallsCount: 0,
        },
        history: [],
        limits: PRO_LIMITS,
      }),
    });
  });

  // ── Settings / Tenant endpoints ────────────────────────────────────────────
  await page.route('**/tenant/whatsapp/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ phoneNumberId: '12345678', displayPhone: '+1234567890', wabaId: null, catalogId: null }],
      }),
    });
  });

  await page.route('**/tenant/policies', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            returnPolicy: '',
            shippingPolicy: '',
            faqContent: '',
            timezone: 'UTC',
            autoReplyDelay: 0,
            defaultLanguage: 'EN',
            tone: 'FRIENDLY',
            autoDetectLanguage: false,
            aiEnabled: false,
            businessHours: {},
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/tenant/templates', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    } else {
      await route.continue();
    }
  });

  // ── Orders (raw fetch — json.data.orders) — only the list endpoint ──────────
  // Use a URL predicate to avoid matching the browser navigation URL
  // http://localhost:3001/dashboard/orders (which also contains "/orders").
  await page.route(
    (url) => url.port === '4000' && url.pathname === '/orders',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { orders: [], total: 0 } }),
        });
      } else {
        await route.continue();
      }
    }
  );

  // ── Team (api.request returns json.data; return {members,quota} object so
  //    component else-branch runs and quota bar renders) ──────────────────────
  // Use a URL predicate to avoid matching http://localhost:3001/dashboard/team.
  await page.route(
    (url) => url.port === '4000' && url.pathname === '/team',
    async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            members: [
              { id: 'cmlqs2ktr0001bvh9yssjlemf', name: 'Acme Owner', email: 'owner@acme.test', role: 'owner', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
              { id: 'cmlqs2l3l0003bvh98nkfa2rs', name: 'Acme Agent', email: 'agent@acme.test', role: 'agent', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
              { id: 'cmlqs2l3l0005bvh98nkfa2rs', name: 'Acme Agent2', email: 'agent2@acme.test', role: 'agent', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
            ],
            quota: { current: 3, limit: 3 },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // ── Inject auth token into localStorage on EVERY page navigation.
  // Runs before any page script so AuthContext has the token on first mount.
  await page.addInitScript((t) => {
    localStorage.setItem('auth_token', t);
  }, token);
}

interface AuthFixtures {
  ownerPage: Page;
  agentPage: Page;
}

export const test = base.extend<AuthFixtures>({
  ownerPage: async ({ page }, use) => {
    const { ownerToken } = readTokenCache();
    await setupAuthenticatedPage(page, ownerToken, OWNER_USER);
    await use(page);
  },

  agentPage: async ({ page }, use) => {
    const { agentToken } = readTokenCache();
    await setupAuthenticatedPage(page, agentToken, AGENT_USER);
    await use(page);
  },
});

export { expect } from '@playwright/test';

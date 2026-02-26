import { test, expect } from './fixtures/auth.fixture';

// Mock response shapes that match what the real analytics API returns when no data is seeded
const EMPTY_OVERVIEW = { totalConversations: 0, activeConversations: 0, totalCases: 0, openCases: 0, avgResponseTime: 0, slaBreaches: 0 };

test.describe('Analytics page', () => {
  test.beforeEach(async ({ ownerPage: page }) => {
    // Mock all 4 analytics API endpoints.
    // Seed data has no conversations/cases so the real API returns empty results anyway.
    // Mocking avoids burning 4 × N API calls against the 100-req/min rate limiter.
    await page.route('**/analytics/overview**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: EMPTY_OVERVIEW }) });
    });
    await page.route('**/analytics/intents**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });
    await page.route('**/analytics/agents**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });
    await page.route('**/analytics/sla**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto('/dashboard/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({ timeout: 10000 });
  });

  test('shows Analytics heading', async ({ ownerPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  });

  test('shows all 4 overview metric cards', async ({ ownerPage: page }) => {
    await expect(page.getByText('Total Conversations')).toBeVisible();
    await expect(page.getByText('Total Cases')).toBeVisible();
    await expect(page.getByText('Avg Response Time')).toBeVisible();
    await expect(page.getByText('SLA Breaches')).toBeVisible();
  });

  test('metric cards show numeric values', async ({ ownerPage: page }) => {
    await page.waitForLoadState('networkidle');
    // Each metric card shows a value — "0" for empty demo data
    const metricValues = page.locator('.text-3xl, .text-2xl').filter({ hasText: /^\d/ });
    expect(await metricValues.count()).toBeGreaterThanOrEqual(1);
  });

  test('shows Intent Distribution section', async ({ ownerPage: page }) => {
    await expect(page.getByText('Intent Distribution')).toBeVisible();
  });

  test('shows Agent Performance section', async ({ ownerPage: page }) => {
    await expect(page.getByText('Agent Performance')).toBeVisible();
  });

  test('shows SLA Performance section', async ({ ownerPage: page }) => {
    await expect(page.getByText('SLA Performance')).toBeVisible();
  });

  test('agent performance section renders (data or empty state)', async ({ ownerPage: page }) => {
    await page.waitForLoadState('networkidle');
    // Section always renders; content depends on whether case/conversation data exists
    const agentSection = page.locator('.rounded-lg').filter({ hasText: 'Agent Performance' });
    await expect(agentSection).toBeVisible();
  });
});

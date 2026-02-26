import { test, expect } from './fixtures/auth.fixture';

test.describe('Billing page', () => {
  test.beforeEach(async ({ ownerPage: page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.getByRole('heading', { name: 'Billing & Plans' })).toBeVisible({ timeout: 10000 });
  });

  test('shows current plan as PRO', async ({ ownerPage: page }) => {
    await expect(page.getByText(/pro plan/i)).toBeVisible();
  });

  test('shows Current Month Usage section', async ({ ownerPage: page }) => {
    await expect(page.getByText('Current Month Usage')).toBeVisible();
  });

  test('shows usage bars for all counters', async ({ ownerPage: page }) => {
    // Use exact:true to avoid matching plan feature text like "500 inbound messages / month"
    await expect(page.getByText('Inbound Messages', { exact: true })).toBeVisible();
    await expect(page.getByText('Outbound Messages (daily limit)', { exact: true })).toBeVisible();
    // Automation Events bar only renders for plans with automationEnabled=true (PRO+)
    await expect(page.getByText('Automation Events', { exact: true })).toBeVisible();
    await expect(page.getByText('AI Calls', { exact: true })).toBeVisible();
  });

  test('shows Free, Pro, Business plan cards', async ({ ownerPage: page }) => {
    // Use exact:true to avoid matching "<h2>pro Plan</h2>" when searching for "Pro"
    await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Business', exact: true })).toBeVisible();
  });

  test('shows plan features in each card', async ({ ownerPage: page }) => {
    await expect(page.getByText('1 agent')).toBeVisible();
    await expect(page.getByText('3 agents')).toBeVisible();
    await expect(page.getByText('10 agents')).toBeVisible();
  });

  test('owner sees Manage Subscription button on paid plan', async ({ ownerPage: page }) => {
    await expect(page.getByRole('button', { name: 'Manage Subscription' })).toBeVisible();
  });

  test('owner sees Upgrade to Business button', async ({ ownerPage: page }) => {
    await expect(page.getByRole('button', { name: /upgrade to business/i })).toBeVisible();
  });

  test('non-owner sees view-only banner', async ({ agentPage: page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.getByRole('heading', { name: 'Billing & Plans' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/view-only access/i)).toBeVisible();
  });

  test('non-owner does not see Manage Subscription button', async ({ agentPage: page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.getByRole('heading', { name: 'Billing & Plans' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Manage Subscription' })).not.toBeVisible();
  });

  test('shows plan limits (agents, products)', async ({ ownerPage: page }) => {
    await expect(page.getByText('Max Agents')).toBeVisible();
    await expect(page.getByText('Max Products')).toBeVisible();
  });
});

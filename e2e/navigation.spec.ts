import { test, expect } from './fixtures/auth.fixture';

const PAGES = [
  { path: '/dashboard/inbox',     heading: 'Inbox' },
  { path: '/dashboard/cases',     heading: 'Cases' },
  { path: '/dashboard/products',  heading: 'Products' },
  { path: '/dashboard/orders',    heading: 'Orders' },
  { path: '/dashboard/analytics', heading: 'Analytics' },
  { path: '/dashboard/billing',   heading: 'Billing & Plans' },
  { path: '/dashboard/team',      heading: 'Team' },
  { path: '/dashboard/settings',  heading: 'Settings' },
];

test.describe('Page navigation', () => {
  for (const { path, heading } of PAGES) {
    test(`${path} loads and shows "${heading}"`, async ({ ownerPage: page }) => {
      await page.goto(path);
      // exact:true prevents "Cases" from matching <h3>No cases found</h3> and similar
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 10000 });
    });
  }
});

test.describe('Sidebar', () => {
  test('shows all nav links on desktop', async ({ ownerPage: page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible({ timeout: 10000 });

    for (const name of ['Inbox', 'Cases', 'Products', 'Orders', 'Analytics', 'Billing', 'Team', 'Settings']) {
      await expect(page.getByRole('link', { name: new RegExp(name, 'i') })).toBeVisible();
    }
  });

  test('shows logged-in user name and email', async ({ ownerPage: page }) => {
    await page.goto('/dashboard/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Acme Owner')).toBeVisible();
    await expect(page.getByText('owner@acme.test')).toBeVisible();
  });

  test('shows Sign out button', async ({ ownerPage: page }) => {
    await page.goto('/dashboard/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});

test.describe('No server errors', () => {
  test('no 5xx responses on any dashboard page', async ({ ownerPage: page }) => {
    for (const { path } of PAGES) {
      const failed: string[] = [];
      const listener = (res: { status: () => number; url: () => string }) => {
        if (res.status() >= 500) failed.push(`${res.status()} ${res.url()}`);
      };
      page.on('response', listener);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      page.off('response', listener);
      expect(failed, `5xx errors on ${path}: ${failed.join(', ')}`).toHaveLength(0);
    }
  });
});

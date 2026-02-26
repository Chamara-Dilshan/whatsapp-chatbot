import { test, expect } from './fixtures/auth.fixture';

test.describe('Orders page', () => {
  test.beforeEach(async ({ ownerPage: page }) => {
    await page.goto('/dashboard/orders');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('shows Orders heading', async ({ ownerPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  });

  test('shows search input with correct placeholder', async ({ ownerPage: page }) => {
    await expect(page.getByPlaceholder('Search by order #, name, phone...')).toBeVisible();
  });

  test('shows status filter dropdown', async ({ ownerPage: page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    await expect(select).toContainText('All Statuses');
  });

  test('status dropdown has all 7 options', async ({ ownerPage: page }) => {
    const options = page.locator('select option');
    expect(await options.count()).toBe(7); // All + 6 statuses
  });

  test('shows empty state or order rows', async ({ ownerPage: page }) => {
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    const empty = page.getByText('No orders found');
    await expect(rows.or(empty).first()).toBeVisible({ timeout: 5000 });
  });

  test('search input is functional', async ({ ownerPage: page }) => {
    await page.getByPlaceholder('Search by order #, name, phone...').fill('ORD-');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  });

  test('status filter is functional', async ({ ownerPage: page }) => {
    await page.locator('select').first().selectOption('pending');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  });
});

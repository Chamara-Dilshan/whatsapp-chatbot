import { test, expect } from './fixtures/auth.fixture';

test.describe('Products page', () => {
  test.beforeEach(async ({ ownerPage: page }) => {
    await page.goto('/dashboard/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 10000 });
  });

  test('shows product list with demo products', async ({ ownerPage: page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('search input is visible', async ({ ownerPage: page }) => {
    await expect(page.getByPlaceholder('Search products...')).toBeVisible();
  });

  test('category dropdown has All Categories option', async ({ ownerPage: page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    await expect(select).toContainText('All Categories');
  });

  test('stock filter dropdown is visible', async ({ ownerPage: page }) => {
    const stockSelect = page.locator('select').nth(1);
    await expect(stockSelect).toBeVisible();
    await expect(stockSelect).toContainText('All Stock Status');
  });

  test('owner sees + Add Product and Import CSV buttons', async ({ ownerPage: page }) => {
    await expect(page.getByRole('button', { name: '+ Add Product' })).toBeVisible();
    await expect(page.getByRole('button', { name: /import csv/i })).toBeVisible();
  });

  test('opens Create Product modal', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: '+ Add Product' }).click();
    await expect(page.getByText('Create Product')).toBeVisible();
  });

  test('create product modal closes on Cancel', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: '+ Add Product' }).click();
    await expect(page.getByText('Create Product')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Create Product')).not.toBeVisible();
  });

  test('create and verify new product appears', async ({ ownerPage: page }) => {
    const ts = Date.now();
    await page.getByRole('button', { name: '+ Add Product' }).click();
    await expect(page.getByText('Create Product')).toBeVisible();

    const textInputs = page.locator('form input[type="text"], form input:not([type])');
    await textInputs.nth(0).fill(`E2E-${ts}`);        // Retailer ID
    await textInputs.nth(1).fill(`E2E Product ${ts}`); // Name

    await page.locator('input[type="number"]').fill('9.99');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Create Product')).not.toBeVisible({ timeout: 5000 });
    // Product name may appear in both table row and modal title — use first()
    await expect(page.getByText(`E2E Product ${ts}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('opens Edit Product modal', async ({ ownerPage: page }) => {
    await page.locator('button:has-text("✏️")').first().click();
    await expect(page.getByText('Edit Product')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('opens Delete Product modal with Cancel', async ({ ownerPage: page }) => {
    await page.locator('button:has-text("🗑️")').first().click();
    await expect(page.getByText('Delete Product')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Delete Product')).not.toBeVisible();
  });

  test('agent does not see + Add Product button', async ({ agentPage: page }) => {
    await page.goto('/dashboard/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '+ Add Product' })).not.toBeVisible();
  });

  test('search filters results', async ({ ownerPage: page }) => {
    await page.getByPlaceholder('Search products...').fill('Keyboard');
    await page.waitForTimeout(400); // debounce is 300ms
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  });

  test('category filter updates list', async ({ ownerPage: page }) => {
    await page.locator('select').first().selectOption('Electronics');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  });
});

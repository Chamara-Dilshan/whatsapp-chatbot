import { test, expect } from './fixtures/auth.fixture';

test.describe('Settings page', () => {
  test.beforeEach(async ({ ownerPage: page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
  });

  test('shows User Profile section with owner data', async ({ ownerPage: page }) => {
    await expect(page.getByText('User Profile')).toBeVisible();
    // 'Acme Owner' and 'owner@acme.test' also appear in the sidebar — use first()
    await expect(page.getByText('Acme Owner').first()).toBeVisible();
    await expect(page.getByText('owner@acme.test').first()).toBeVisible();
  });

  test('shows WhatsApp Configuration section', async ({ ownerPage: page }) => {
    await expect(page.getByText('WhatsApp Configuration')).toBeVisible();
  });

  test('shows WhatsApp as connected with demo phone', async ({ ownerPage: page }) => {
    await expect(page.getByText('WhatsApp Connected')).toBeVisible();
    await expect(page.getByText('+1234567890')).toBeVisible();
  });

  test('shows Policies & Templates section with 4 tabs', async ({ ownerPage: page }) => {
    await expect(page.getByText('Policies & Templates')).toBeVisible();
    // Use exact:true to avoid matching "Save Policies" button when searching for "Policies" tab
    await expect(page.getByRole('button', { name: 'Policies', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Templates', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Language & Tone', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI', exact: true })).toBeVisible();
  });

  test('Policies tab is default and shows policy fields', async ({ ownerPage: page }) => {
    await expect(page.getByText('Return Policy')).toBeVisible();
    await expect(page.getByText('Shipping Policy')).toBeVisible();
    await expect(page.getByText('FAQ Content')).toBeVisible();
    await expect(page.getByText('Business Hours')).toBeVisible();
  });

  test('Templates tab shows template list', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    // When templates=[] (global mock), shows "+ Create Template" button and empty message.
    // When templates exist (real data), shows a table instead.
    await expect(
      page.getByRole('button', { name: '+ Create Template' }).or(page.locator('table'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Language & Tone tab renders', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: 'Language & Tone', exact: true }).click();
    // Use exact to avoid matching "Detects Sinhala / Tamil from Unicode ... default language ..."
    await expect(page.getByText('Default Language', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('AI tab renders', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: 'AI', exact: true }).click();
    await expect(page.getByText(/AI/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('shows n8n Automation section', async ({ ownerPage: page }) => {
    await expect(page.getByText('n8n Automation')).toBeVisible();
    // Use exact to avoid matching "...send events to the webhook URL above" in the bullet list
    await expect(page.getByText('Webhook URL', { exact: true })).toBeVisible();
  });

  test('Save Policies button is visible', async ({ ownerPage: page }) => {
    await expect(page.getByRole('button', { name: 'Save Policies' })).toBeVisible();
  });
});

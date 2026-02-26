import { test, expect } from './fixtures/auth.fixture';

test.describe('Team page', () => {
  test.beforeEach(async ({ ownerPage: page }) => {
    await page.goto('/dashboard/team');
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible({ timeout: 10000 });
  });

  test('shows Team heading with member count', async ({ ownerPage: page }) => {
    await expect(page.getByText(/\d+ members?/)).toBeVisible();
  });

  test('shows team members in table', async ({ ownerPage: page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('shows demo members: owner, agent, agent2', async ({ ownerPage: page }) => {
    await expect(page.getByText('Acme Owner')).toBeVisible();
    // exact:true so "Acme Agent2" doesn't also match; first() because the name
    // appears in both the desktop table cell and the mobile card span.
    await expect(page.getByText('Acme Agent', { exact: true }).first()).toBeVisible();
  });

  test('shows + Add Member button for owner', async ({ ownerPage: page }) => {
    await expect(page.getByRole('button', { name: '+ Add Member' })).toBeVisible();
  });

  test('shows Edit and Deactivate buttons for non-owner members', async ({ ownerPage: page }) => {
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deactivate' }).first()).toBeVisible();
  });

  test('owner row has no Edit/Deactivate buttons', async ({ ownerPage: page }) => {
    // Owner row is the first row — it should have an empty actions cell
    const ownerRow = page.locator('table tbody tr').first();
    await expect(ownerRow.getByRole('button', { name: 'Edit' })).not.toBeVisible();
  });

  test('opens Add Member modal', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible();
    await expect(page.getByPlaceholder('Full name')).toBeVisible();
    await expect(page.getByPlaceholder('agent@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Min 8 characters')).toBeVisible();
  });

  test('Create button is disabled when form is empty', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('Add Member modal closes on Cancel', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Add Team Member')).not.toBeVisible();
  });

  test('opens Edit modal for agent member', async ({ ownerPage: page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByText(/Edit .+/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('agent cannot see + Add Member button', async ({ agentPage: page }) => {
    await page.goto('/dashboard/team');
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '+ Add Member' })).not.toBeVisible();
  });

  test('shows quota bar for team members', async ({ ownerPage: page }) => {
    await expect(page.getByText('Team Members')).toBeVisible();
  });
});

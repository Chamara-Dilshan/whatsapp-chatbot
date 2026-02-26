import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('has links to forgot-password and register', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.rounded-md.bg-red-50')).toBeVisible();
  });

  test('successful login redirects to /dashboard', async ({ page }) => {
    // Mock /auth/login and /auth/me to avoid hitting IP-based rate limiters
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 'cmlqs2ktr0001bvh9yssjlemf', email: 'owner@acme.test', name: 'Acme Owner', role: 'owner', tenantId: 'tenant_demo_001' },
          },
        }),
      });
    });
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 'cmlqs2ktr0001bvh9yssjlemf', email: 'owner@acme.test', name: 'Acme Owner', role: 'owner', tenantId: 'tenant_demo_001' } },
        }),
      });
    });
    await page.goto('/login');
    await page.getByLabel('Email').fill('owner@acme.test');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard**');
    expect(page.url()).toContain('/dashboard');
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    // Mock /auth/login and /auth/me to avoid hitting IP-based rate limiters
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 'cmlqs2ktr0001bvh9yssjlemf', email: 'owner@acme.test', name: 'Acme Owner', role: 'owner', tenantId: 'tenant_demo_001' },
          },
        }),
      });
    });
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 'cmlqs2ktr0001bvh9yssjlemf', email: 'owner@acme.test', name: 'Acme Owner', role: 'owner', tenantId: 'tenant_demo_001' } },
        }),
      });
    });
    await page.goto('/login');
    await page.getByLabel('Email').fill('owner@acme.test');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard**');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});

test.describe('Register page', () => {
  test('renders all registration fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByLabel('Business Name')).toBeVisible();
    await expect(page.getByLabel('Your Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('shows error for duplicate tenant', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Business Name').fill('Acme Store');
    await page.getByLabel('Your Name').fill('Test User');
    await page.getByLabel('Email').fill(`new${Date.now()}@test.com`);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Forgot password page', () => {
  test('renders email form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('shows confirmation after submit', async ({ page }) => {
    // Mock the endpoint to avoid the 3/15 min IP rate limiter on repeated test runs
    await page.route('**/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { message: 'If that email exists, a reset link has been sent.' } }),
      });
    });
    await page.goto('/forgot-password');
    await page.getByRole('textbox').fill('owner@acme.test');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Reset password page', () => {
  test('shows error with no token in URL', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(/invalid|missing/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth redirect guards', () => {
  test('unauthenticated /dashboard/inbox redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/inbox');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated /dashboard/team redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/team');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated /dashboard/billing redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});

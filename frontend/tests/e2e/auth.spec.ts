import { test, expect } from '@playwright/test';

/**
 * Authentication E2E tests.
 *
 * These tests verify the login flow and that unauthenticated users are
 * redirected to /login when they try to access protected routes.
 *
 * NOTE: Tests rely on the Vite dev server and the backend being up.  In CI
 * (GitHub Actions) we set E2E_BASE_URL so the webServer block is skipped and
 * the pre-started server is used instead.
 */

test.describe('Authentication flow', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders the username and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('shows validation error on empty form submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Either HTML5 required validation or an error message must appear
    const emailField = page.getByLabel(/email/i);
    const validationError = page.getByRole('alert');
    const hasHtml5Required = await emailField.evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing,
    );
    if (!hasHtml5Required) {
      await expect(validationError).toBeVisible();
    }
  });

  test('shows error message with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nonexistent-user');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Expect an error notification — exact text varies by implementation
    await expect(
      page.getByRole('alert').or(page.getByText(/invalid|incorrect|failed/i)),
    ).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from '@playwright/test';

/**
 * POS page E2E tests.
 *
 * These tests assume a running backend (seeded with at least one product) and
 * a valid test user.  In local dev, set the environment variables:
 *   TEST_USER_EMAIL=manager
 *   TEST_USER_PASSWORD=manager123
 *
 * Because the backend may not be seeded in CI (E2E is primarily a smoke test),
 * many assertions use soft expectations or check UI state rather than data.
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? 'manager';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'manager123';

test.describe('POS page', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.getByLabel(/username/i).fill(EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Wait for navigation away from /login (either dashboard or POS)
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15_000,
    });
  });

  test('can navigate to POS page', async ({ page }) => {
    await page.goto('/app/pos');
    await expect(page).toHaveURL(/\/pos/);
    // The POS page must have a cart or product list section
    await expect(
      page.getByRole('heading', { name: 'POS', exact: true }).or(
        page.getByTestId('pos-page'),
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('POS page shows product search or product list', async ({ page }) => {
    await page.goto('/app/pos');
    // Either a search input or at least one product card should be visible
    const searchInput = page.getByPlaceholder(/scan barcode|type sku/i);
    const productList = page.getByTestId('product-list').or(page.getByRole('list'));
    const either = searchInput.or(productList);
    await expect(either.first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows offline banner when simulating offline mode', async ({ page, context }) => {
    await page.goto('/app/pos');
    // Simulate going offline via Playwright's network emulation
    await context.setOffline(true);
    // Trigger a network state change so the banner appears
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    // The offline banner should become visible
    await expect(
      page.getByRole('alert').or(page.getByText(/offline|no connection|disconnected/i)),
    ).toBeVisible({ timeout: 5_000 });
    // Restore online state
    await context.setOffline(false);
  });
});

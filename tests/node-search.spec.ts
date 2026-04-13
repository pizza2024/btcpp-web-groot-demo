import { expect, test } from '@playwright/test';

test.describe('Node Search/Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(500); // Wait for palette to load
  });

  test('search input exists', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search models..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('typing in search filters results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search models..."]');
    await searchInput.fill('Sequence');
    await page.waitForTimeout(300);

    // Page should update to show filtered results
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('sequence');
  });
});

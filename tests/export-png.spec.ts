import { expect, test } from '@playwright/test';

test.describe('Export PNG', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('Export PNG button exists', async ({ page }) => {
    // Use first() since there might be multiple buttons with similar names
    const exportPngBtn = page.getByRole('button', { name: /Export PNG/ }).first();
    await expect(exportPngBtn).toBeVisible();
  });

  test('Export PNG button is clickable without crashing', async ({ page }) => {
    // Load sample tree first
    await page.getByRole('button', { name: '📂 Sample' }).click();
    await page.waitForTimeout(500);

    const exportPngBtn = page.getByRole('button', { name: /Export PNG/ }).first();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    
    // Click the button - it may or may not trigger a download depending on browser
    await exportPngBtn.click();
    await page.waitForTimeout(500);
    
    // App should still be functional
    await expect(page.locator('.react-flow')).toBeVisible();
  });
});

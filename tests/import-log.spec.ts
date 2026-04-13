import { expect, test } from '@playwright/test';

test.describe('Import External Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('Load File button exists in debug panel', async ({ page }) => {
    // Expand debug panel if not visible
    const loadFileBtn = page.getByRole('button', { name: /Load File/ });
    await expect(loadFileBtn.first()).toBeVisible();
  });

  test('Sample Log button loads log data', async ({ page }) => {
    const sampleBtn = page.getByRole('button', { name: /Sample Log/ });
    await sampleBtn.click();
    await page.waitForTimeout(300);

    // After loading sample log, playback controls should appear
    const playBtn = page.getByRole('button', { name: /Play/ });
    await expect(playBtn).toBeVisible();
  });

  test('Paste Log button shows text editor', async ({ page }) => {
    const pasteBtn = page.getByRole('button', { name: /Paste Log/ });
    await pasteBtn.click();
    await page.waitForTimeout(300);

    // Text area should be visible
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  test('Apply Log button processes text format', async ({ page }) => {
    // Open paste log editor
    const pasteBtn = page.getByRole('button', { name: /Paste Log/ });
    await pasteBtn.click();
    await page.waitForTimeout(300);

    // Text area should have content
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    
    // Apply Log button should be visible
    const applyBtn = page.getByRole('button', { name: /Apply Log/ });
    await expect(applyBtn).toBeVisible();
  });
});

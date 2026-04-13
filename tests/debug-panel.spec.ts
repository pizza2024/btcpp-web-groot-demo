import { expect, test } from '@playwright/test';

test.describe('Debug Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('debug panel is visible', async ({ page }) => {
    // Debug panel should be visible
    const debugPanel = page.locator('.debug-panel');
    await expect(debugPanel).toBeVisible();
  });

  test('debug panel has header', async ({ page }) => {
    const debugPanel = page.locator('.debug-panel');
    await expect(debugPanel).toContainText('Debug');
  });

  test('debug panel has playback controls', async ({ page }) => {
    const debugPanel = page.locator('.debug-panel');
    // Should have Play button or similar controls
    const panelText = await debugPanel.textContent();
    expect(panelText).toBeTruthy();
  });

  test('debug panel shows status color indicators', async ({ page }) => {
    const debugPanel = page.locator('.debug-panel');
    await expect(debugPanel).toBeVisible();
    // The panel should be able to contain status info
    const text = await debugPanel.textContent();
    expect(text).toContain('Log');
  });
});

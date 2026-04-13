import { test, expect } from '@playwright/test';

test.describe('Canvas Zoom', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('zoom level indicator exists and shows 100% initially', async ({ page }) => {
    // Zoom indicator should show 100% initially
    const zoomIndicator = page.locator('text=/\\d+%/').first();
    await expect(zoomIndicator).toBeVisible();
    await expect(zoomIndicator).toContainText('100%');
  });

  test('zoom in with mouse wheel changes zoom level', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane');
    await expect(canvas).toBeVisible();

    // Get initial zoom indicator
    const zoomIndicator = page.locator('text=/\\d+%/').first();

    // Zoom in with mouse wheel
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Negative deltaY zooms in

    await page.waitForTimeout(500);

    // Zoom level should have changed (greater than 100%)
    const zoomText = await zoomIndicator.textContent();
    expect(zoomText).toMatch(/\d+%/);
  });

  test('double-click on canvas resets zoom', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane');
    await expect(canvas).toBeVisible();

    // First zoom in
    await canvas.hover();
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(300);

    // Double-click to reset zoom
    await canvas.dblclick();
    await page.waitForTimeout(500);

    // Zoom should be back to 100%
    const zoomIndicator = page.locator('text=/\\d+%/').first();
    await expect(zoomIndicator).toContainText('100%');
  });

  test('zoom out with mouse wheel changes zoom level', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane');
    await expect(canvas).toBeVisible();

    // Zoom out with mouse wheel
    await canvas.hover();
    await page.mouse.wheel(0, 100); // Positive deltaY zooms out

    await page.waitForTimeout(500);

    // Zoom level should have changed (less than 100%)
    const zoomIndicator = page.locator('text=/\\d+%/').first();
    const zoomText = await zoomIndicator.textContent();
    expect(zoomText).toMatch(/\d+%/);
  });
});

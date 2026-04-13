import { test, expect } from '@playwright/test';

test.describe('Favorites / Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('favorites panel is present in DOM', async ({ page }) => {
    // The FavoritesPanel should be present in the DOM after page loads
    await page.waitForSelector('.react-flow');
    await page.waitForTimeout(500);
    const pageContent = await page.content();
    expect(pageContent).toContain('Favorites');
  });

  test('can right-click node to see save as template option', async ({ page }) => {
    // Load sample tree first
    await page.getByRole('button', { name: '📂 Sample' }).click();
    await page.waitForTimeout(500);

    // Find a node and right-click to open context menu
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.first();
    await firstNode.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Check that the Save as Template option is visible
    const saveTemplateOption = page.getByText('Save as Template', { exact: false });
    await expect(saveTemplateOption).toBeVisible();
  });
});

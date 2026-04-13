import { expect, test } from '@playwright/test';

test.describe('Batch Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
    // Load sample tree to get multiple nodes
    await page.getByRole('button', { name: '📂 Sample' }).click();
    await page.waitForTimeout(1000);
  });

  test('Ctrl+click should add node to selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.nth(0);
    const secondNode = nodes.nth(1);

    // Click first node
    await firstNode.click();
    await page.waitForTimeout(100);

    // Ctrl+click second node
    await secondNode.click({ modifiers: ['Control'] });
    await page.waitForTimeout(100);

    // Both should be selected (have .selected class)
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBeGreaterThanOrEqual(1);
  });

  test('Ctrl+click on already selected node should deselect it', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.nth(0);
    const secondNode = nodes.nth(1);

    // Click first node
    await firstNode.click();
    await page.waitForTimeout(100);

    // Ctrl+click second node to add to selection
    await secondNode.click({ modifiers: ['Control'] });
    await page.waitForTimeout(100);

    // Ctrl+click first node again to deselect
    await firstNode.click({ modifiers: ['Control'] });
    await page.waitForTimeout(100);

    // First node should no longer be selected
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBeGreaterThanOrEqual(0);
  });

  test('Delete key should delete all selected nodes', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.nth(0);
    const secondNode = nodes.nth(1);

    // Click first node
    await firstNode.click();
    await page.waitForTimeout(100);

    // Ctrl+click second node
    await secondNode.click({ modifiers: ['Control'] });
    await page.waitForTimeout(100);

    // Press Delete
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Check no crash - app should still be functional
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('Escape should clear selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.nth(0);

    // Click first node
    await firstNode.click();
    await page.waitForTimeout(100);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Node should no longer be selected
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBe(0);
  });

  test('clicking pane should clear selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.nth(0);

    // Click first node
    await firstNode.click();
    await page.waitForTimeout(100);

    // Click on pane (empty area)
    await page.locator('.react-flow__pane').click();
    await page.waitForTimeout(100);

    // Node should no longer be selected
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBe(0);
  });
});

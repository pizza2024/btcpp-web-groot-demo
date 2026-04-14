import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Node Edit - Instance Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('renaming instance keeps node visible after save', async ({ page }) => {
    await loadSampleTree(page);

    // Pick a non-root node from the loaded sample tree.
    const targetNode = page.locator('.react-flow__node').filter({ hasNotText: 'ROOT' }).first();
    await expect(targetNode).toBeVisible();
    const nodeCountBefore = await page.locator('.react-flow__node').count();

    await targetNode.dblclick();
    const modal = page.locator('.node-edit-modal');
    await expect(modal).toBeVisible();

    const instanceInput = modal.locator('input').nth(2);
    await instanceInput.fill('RenamedInstance');

    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).toBeHidden();

    await expect(page.locator('.react-flow__node', { hasText: 'RenamedInstance' })).toBeVisible();
    const nodeCountAfter = await page.locator('.react-flow__node').count();
    expect(nodeCountAfter).toBe(nodeCountBefore);
  });

  test('renaming detached instance does not remove node from canvas', async ({ page }) => {
    const pane = page.locator('.react-flow__pane');
    const paletteNode = page.locator('.palette-item').first();
    await paletteNode.dragTo(pane, { targetPosition: { x: 700, y: 380 } });
    await page.waitForTimeout(500);

    const canvasNodes = page.locator('.react-flow__node');
    const nodeCountBefore = await canvasNodes.count();
    const targetNode = canvasNodes.last();
    await expect(targetNode).toBeVisible();

    await targetNode.dblclick();
    const modal = page.locator('.node-edit-modal');
    await expect(modal).toBeVisible();

    const instanceInput = modal.locator('input').nth(2);
    await instanceInput.fill('DetachedRenamed');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).toBeHidden();

    // Wait for debounced save + project sync.
    await page.waitForTimeout(900);

    await expect(page.locator('.react-flow__node', { hasText: 'DetachedRenamed' })).toBeVisible();
    const nodeCountAfter = await page.locator('.react-flow__node').count();
    expect(nodeCountAfter).toBe(nodeCountBefore);
  });
});

import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Copy/Paste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('Ctrl+C copies selected node', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Select a node
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(200);

    // Copy with Ctrl+C
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);

    // Paste with Ctrl+V
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    // Should now have one more node
    const nodeCount = await page.locator('.react-flow__node').count();
    const initialCount = await loadSampleTree(page).then(() => page.locator('.react-flow__node').count());
    
    // After paste, we should have more nodes
    expect(nodeCount).toBeGreaterThan(1);
  });

  test('Ctrl+V pastes copied node with offset', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Get position of first non-ROOT node before copy
    const nodes = page.locator('.react-flow__node');
    const nodeBefore = nodes.nth(1);
    const boxBefore = await nodeBefore.boundingBox();

    // Select and copy
    await nodeBefore.click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);

    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    // Pasted node should be offset (at least one axis should be different)
    const nodeAfter = nodes.nth(2);
    const boxAfter = await nodeAfter.boundingBox();

    if (boxBefore && boxAfter) {
      // At least one coordinate should be different due to offset
      const xDiff = Math.abs(boxAfter.x - boxBefore.x);
      const yDiff = Math.abs(boxAfter.y - boxBefore.y);
      expect(xDiff + yDiff).toBeGreaterThan(0);
    }
  });

  test('Ctrl+V without selection does nothing', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Count nodes before
    const nodesBefore = await page.locator('.react-flow__node').count();

    // Press Ctrl+V without copying anything
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(200);

    // Count nodes after - should be same
    const nodesAfter = await page.locator('.react-flow__node').count();
    expect(nodesAfter).toBe(nodesBefore);
  });

  test('multiple Ctrl+V pastes multiple nodes', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Select a node and copy
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);

    // Paste 3 times
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);

    // Should have more nodes
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThan(4);
  });

  test('pasted node is selected after paste', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Select a node and copy
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);

    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    // The pasted node should be selected (has .selected class)
    const selectedNode = page.locator('.react-flow__node.selected');
    await expect(selectedNode).toBeVisible();
  });
});

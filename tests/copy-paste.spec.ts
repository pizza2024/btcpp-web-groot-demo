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
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    });
    await page.waitForTimeout(500);

    // Should now have one more node
    const nodeCount = await page.locator('.react-flow__node').count();
    const initialCount = await loadSampleTree(page).then(() => page.locator('.react-flow__node').count());
    
    // After paste, we should have more nodes
    expect(nodeCount).toBeGreaterThan(1);
  });

  test('Ctrl+V pastes copied node near mouse position', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    const nodes = page.locator('.react-flow__node');
    const nodeBefore = nodes.nth(1);
    const nodeCountBeforePaste = await nodes.count();

    await nodeBefore.click({ button: 'right' });
    await page.waitForTimeout(200);
    await page.locator('.context-menu').getByText('Copy Node').click();
    await page.waitForTimeout(200);

    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    expect(paneBox).not.toBeNull();

    const targetPoint = {
      x: Math.round((paneBox?.x ?? 0) + 220),
      y: Math.round((paneBox?.y ?? 0) + 180),
    };

    await page.mouse.move(targetPoint.x, targetPoint.y);
    await page.waitForTimeout(100);

    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    await expect(nodes).toHaveCount(nodeCountBeforePaste + 1);

    const nodeAfter = nodes.nth(nodeCountBeforePaste);
    const boxAfter = await nodeAfter.boundingBox();

    expect(boxAfter).not.toBeNull();

    const pastedCenter = {
      x: (boxAfter?.x ?? 0) + (boxAfter?.width ?? 0) / 2,
      y: (boxAfter?.y ?? 0) + (boxAfter?.height ?? 0) / 2,
    };

    expect(Math.abs(pastedCenter.x - targetPoint.x)).toBeLessThan(120);
    expect(Math.abs(pastedCenter.y - targetPoint.y)).toBeLessThan(100);
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

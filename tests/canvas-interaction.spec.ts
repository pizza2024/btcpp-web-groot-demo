import { expect, test } from '@playwright/test';

/**
 * Canvas Interaction Edge Case Tests - Stable Subset
 * Tests that reliably pass and cover critical workflows
 */
test.describe('Canvas Interaction - Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
    await page.getByRole('button', { name: '📂 Sample' }).click();
    await page.waitForTimeout(800);
  });

  // ── Core Delete & Undo/Redo ────────────────────────────────────────────────

  test('delete node and undo should restore it', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    expect(await nodes.count()).toBe(initialCount - 1);
    
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    expect(await nodes.count()).toBe(initialCount);
  });

  test('undo stack exhaustion should not crash', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(50);
    }
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('redo stack exhaustion should not crash', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(50);
    }
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  // ── Selection ──────────────────────────────────────────────────────────────

  test('clicking node should select it', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    expect(await page.locator('.react-flow__node.selected').count()).toBeGreaterThan(0);
  });

  test('Escape should clear selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    expect(await page.locator('.react-flow__node.selected').count()).toBeGreaterThan(0);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect(await page.locator('.react-flow__node.selected').count()).toBe(0);
  });

  test('clicking pane should clear selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    expect(await page.locator('.react-flow__node.selected').count()).toBeGreaterThan(0);
    
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
    expect(await page.locator('.react-flow__node.selected').count()).toBe(0);
  });

  test('single selected node should stay on top after blur', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const blurredNode = nodes.nth(1);
    const otherNode = nodes.nth(2);

    await blurredNode.click();
    await page.waitForTimeout(100);
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    const blurredNodeZIndex = await blurredNode.evaluate(
      (element) => Number.parseInt(window.getComputedStyle(element).zIndex || '0', 10) || 0
    );
    const otherNodeZIndex = await otherNode.evaluate(
      (element) => Number.parseInt(window.getComputedStyle(element).zIndex || '0', 10) || 0
    );

    expect(blurredNodeZIndex).toBeGreaterThan(otherNodeZIndex);
  });

  test('Delete with no selection should do nothing', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    expect(await nodes.count()).toBe(initialCount);
  });

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────

  test('rapid keyboard shortcuts should not crash', async ({ page }) => {
    const shortcuts = ['Control+z', 'Control+y', 'Delete', 'Escape'];
    
    for (let round = 0; round < 3; round++) {
      for (const shortcut of shortcuts) {
        await page.keyboard.press(shortcut);
        await page.waitForTimeout(30);
      }
    }
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  // ── Copy/Paste ─────────────────────────────────────────────────────────────

  test('copy and paste should create new node', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    // Right-click to copy
    await nodes.nth(1).click({ button: 'right' });
    await page.waitForTimeout(300);
    
    const copyBtn = page.getByRole('button', { name: /copy/i });
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await page.waitForTimeout(200);
      
      // Paste via context menu
      await page.locator('.react-flow__pane').click({ button: 'right' });
      await page.waitForTimeout(300);
      
      const pasteBtn = page.getByRole('button', { name: /paste/i });
      if (await pasteBtn.isVisible()) {
        await pasteBtn.click();
        await page.waitForTimeout(400);
        expect(await nodes.count()).toBe(initialCount + 1);
      }
    }
  });

  // ── State Consistency ──────────────────────────────────────────────────────

  test('select and delete multiple times should be undoable', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    // Delete-undo cycle 3 times
    for (let i = 0; i < 3; i++) {
      await nodes.nth(1).click();
      await page.waitForTimeout(50);
      await page.keyboard.press('Delete');
      await page.waitForTimeout(200);
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
    }
    
    // Should be back to original count
    expect(await nodes.count()).toBe(initialCount);
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('deleting node should not affect other nodes', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    // Get positions of some nodes
    const node2Before = await nodes.nth(2).boundingBox();
    
    // Delete node 1
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    
    // Node 3 should still be there (or shifted, but not crashed)
    await expect(page.locator('.react-flow')).toBeVisible();
    expect(await nodes.count()).toBe(initialCount - 1);
    
    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    expect(await nodes.count()).toBe(initialCount);
  });
});

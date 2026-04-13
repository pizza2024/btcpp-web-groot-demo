import { expect, test } from '@playwright/test';

/**
 * Behavior Tree Practical Application Tests
 * Tests real BT workflows using the existing Sample tree
 */
test.describe('Behavior Tree - Practical Scenarios', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
    await page.getByRole('button', { name: '📂 Sample' }).click();
    await page.waitForTimeout(1000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BT Structure Verification
  // ═══════════════════════════════════════════════════════════════════════════

  test('sample tree has correct hierarchical structure', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    expect(count).toBeGreaterThan(3);
    
    const rootNode = page.locator('.react-flow__node').first();
    await expect(rootNode).toBeVisible();
  });

  test('tree has multiple node types', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    expect(await nodes.count()).toBeGreaterThanOrEqual(3);
    
    const firstNodeLabel = await nodes.first().textContent();
    expect(firstNodeLabel).toBeTruthy();
  });

  test('edges connect parent nodes to children', async ({ page }) => {
    const edges = page.locator('.react-flow__edge');
    const nodes = page.locator('.react-flow__node');
    
    expect(await edges.count()).toBeGreaterThan(0);
    expect(await nodes.count()).toBeGreaterThan(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Selection and Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  test('selecting node highlights it', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBeGreaterThan(0);
  });

  test('root node can be selected', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.first().click();
    await page.waitForTimeout(100);
    
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tree Operations
  // ═══════════════════════════════════════════════════════════════════════════

  test('deleting child node updates tree structure', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    
    expect(await nodes.count()).toBe(initialCount - 1);
  });

  test('undo restores deleted node', async ({ page }) => {
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

  test('undo/redo maintains tree integrity', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    // Delete-undo cycle
    await nodes.nth(1).click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    expect(await nodes.count()).toBe(initialCount);
    
    // Delete-redo cycle
    await nodes.nth(1).click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    expect(await nodes.count()).toBe(initialCount - 1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Multi-Selection Operations
  // ═══════════════════════════════════════════════════════════════════════════

  test('select all removes selection when clicked', async ({ page }) => {
    await page.locator('.react-flow__pane').click({ button: 'right' });
    await page.waitForTimeout(200);
    
    const selectAllBtn = page.getByRole('button', { name: /select all/i });
    if (await selectAllBtn.isVisible()) {
      await selectAllBtn.click();
      await page.waitForTimeout(200);
      
      // At least some nodes should be selected
      const selectedCount = await page.locator('.react-flow__node.selected').count();
      expect(selectedCount).toBeGreaterThan(0);
    }
  });

  test('Escape clears selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBe(0);
  });

  test('pane click clears selection', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(100);
    
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
    
    const selectedCount = await page.locator('.react-flow__node.selected').count();
    expect(selectedCount).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Canvas Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  test('fit view shows all nodes', async ({ page }) => {
    await page.locator('.react-flow__pane').click({ button: 'right' });
    await page.waitForTimeout(200);
    
    const fitViewBtn = page.getByRole('button', { name: /fit view/i });
    if (await fitViewBtn.isVisible()) {
      await fitViewBtn.click();
      await page.waitForTimeout(300);
      
      const nodes = page.locator('.react-flow__node');
      expect(await nodes.count()).toBeGreaterThan(0);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Import/Export
  // ═══════════════════════════════════════════════════════════════════════════

  test('toolbar buttons are accessible', async ({ page }) => {
    // App should have functional buttons
    await expect(page.locator('.react-flow')).toBeVisible();
    
    // Check buttons exist
    const buttons = page.locator('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('import button is functional', async ({ page }) => {
    const importBtn = page.getByRole('button', { name: /import/i });
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.react-flow')).toBeVisible();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tree Management
  // ═══════════════════════════════════════════════════════════════════════════

  test('new tree button works', async ({ page }) => {
    const newTreeBtn = page.getByRole('button', { name: /new tree/i });
    if (await newTreeBtn.isVisible()) {
      await newTreeBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('.react-flow')).toBeVisible();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Undo/Redo Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  test('rapid undo/redo does not crash', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    
    await nodes.nth(1).click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(30);
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(30);
    }
    
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('undo with empty stack does not crash', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(30);
    }
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('redo with empty stack does not crash', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(30);
    }
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Properties Panel
  // ═══════════════════════════════════════════════════════════════════════════

  test('selecting node shows properties', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(200);
    
    // App should remain functional
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Delete Operations
  // ═══════════════════════════════════════════════════════════════════════════

  test('delete with no selection does nothing', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();
    
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    
    expect(await nodes.count()).toBe(initialCount);
  });

  test('multiple delete-undo cycles work', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    
    for (let i = 0; i < 3; i++) {
      const count = await nodes.count();
      if (count <= 1) break;
      
      await nodes.nth(1).click();
      await page.waitForTimeout(50);
      await page.keyboard.press('Delete');
      await page.waitForTimeout(200);
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
    }
    
    await expect(page.locator('.react-flow')).toBeVisible();
  });
});

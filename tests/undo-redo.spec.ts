import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('Ctrl+Z undoes node deletion', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Get initial node count
    const initialNodes = await page.locator('.react-flow__node').count();
    expect(initialNodes).toBeGreaterThan(1);

    // Select a node - click on the first non-ROOT node
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();  // Second node (first is usually ROOT)
    await page.waitForTimeout(200);

    // Delete it using keyboard
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Verify node is deleted
    const afterDeleteNodes = await page.locator('.react-flow__node').count();
    expect(afterDeleteNodes).toBe(initialNodes - 1);

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    // Verify node is restored
    const afterUndoNodes = await page.locator('.react-flow__node').count();
    expect(afterUndoNodes).toBe(initialNodes);
  });

  test('Ctrl+Y redoes undone operation', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Get initial node count
    const initialNodes = await page.locator('.react-flow__node').count();

    // Select and delete a node
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    // Verify node is back
    const afterUndoNodes = await page.locator('.react-flow__node').count();
    expect(afterUndoNodes).toBe(initialNodes);

    // Redo
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(500);

    // Verify node is deleted again
    const afterRedoNodes = await page.locator('.react-flow__node').count();
    expect(afterRedoNodes).toBe(initialNodes - 1);
  });

  test('Ctrl+Shift+Z also redoes', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Get initial node count
    const initialNodes = await page.locator('.react-flow__node').count();

    // Select and delete a node
    const nodes = page.locator('.react-flow__node');
    await nodes.nth(1).click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    // Verify node is back
    const afterUndoNodes = await page.locator('.react-flow__node').count();
    expect(afterUndoNodes).toBe(initialNodes);

    // Redo using Ctrl+Shift+Z
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(500);

    // Verify node is deleted again
    const afterRedoNodes = await page.locator('.react-flow__node').count();
    expect(afterRedoNodes).toBe(initialNodes - 1);
  });



  test('no crash when undo stack is empty', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Try to undo without any changes - should not crash
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    // App should still be functional
    const nodes = await page.locator('.react-flow__node').count();
    expect(nodes).toBeGreaterThan(0);
  });

  test('no crash when redo stack is empty', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Try to redo without any undo - should not crash
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(200);

    // App should still be functional
    const nodes = await page.locator('.react-flow__node').count();
    expect(nodes).toBeGreaterThan(0);
  });

  test('Ctrl+S does not add to undo stack', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Get initial node count
    const initialNodes = await page.locator('.react-flow__node').count();

    // Press Ctrl+S (export) - should not affect undo stack
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Undo should work normally (go back to initial state, not trigger export)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    // Since we didn't make any changes, nothing to undo
    // The nodes should still be the same
    const afterUndoNodes = await page.locator('.react-flow__node').count();
    expect(afterUndoNodes).toBe(initialNodes);
  });

  test('Escape does not add to undo stack', async ({ page }) => {
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Get initial node count
    const initialNodes = await page.locator('.react-flow__node').count();

    // Press Escape (deselect)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Undo should not affect anything since no changes were made
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    // Nodes should still be the same
    const afterUndoNodes = await page.locator('.react-flow__node').count();
    expect(afterUndoNodes).toBe(initialNodes);
  });
});

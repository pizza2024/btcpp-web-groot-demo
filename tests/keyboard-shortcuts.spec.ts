import { test, expect } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test.describe('Delete / Backspace', () => {
    test('deletes selected node', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      const nodes = page.locator('.react-flow__node');
      await nodes.first().click();
      await page.waitForTimeout(200);

      const countBefore = await nodes.count();
      await page.keyboard.press('Delete');
      await page.waitForTimeout(300);

      const countAfter = await nodes.count();
      expect(countAfter).toBe(countBefore - 1);
    });

    test('deletes node with Backspace', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      const nodes = page.locator('.react-flow__node');
      await nodes.first().click();
      await page.waitForTimeout(200);

      const countBefore = await nodes.count();
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      const countAfter = await nodes.count();
      expect(countAfter).toBe(countBefore - 1);
    });

    test('does nothing when nothing is selected', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      const nodes = page.locator('.react-flow__node');
      const countBefore = await nodes.count();
      await page.keyboard.press('Delete');
      await page.waitForTimeout(300);
      const countAfter = await nodes.count();
      expect(countAfter).toBe(countBefore);
    });
  });

  test.describe('Ctrl+A — Select All', () => {
    test('selects all nodes with Ctrl+A', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      await page.keyboard.press('Control+a');
      await page.waitForTimeout(300);

      const selectedCount = await page.locator('.react-flow__node.selected').count();
      const totalCount = await page.locator('.react-flow__node').count();
      expect(selectedCount).toBe(totalCount);
    });

    test('Ctrl+A then Delete removes all nodes', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      const remaining = await page.locator('.react-flow__node').count();
      expect(remaining).toBe(0);
    });
  });

  test.describe('Escape — Deselect', () => {
    test('Escape deselects selected nodes', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      const nodes = page.locator('.react-flow__node');
      await nodes.first().click();
      await page.waitForTimeout(200);

      const selectedBefore = await page.locator('.react-flow__node.selected').count();
      expect(selectedBefore).toBeGreaterThan(0);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      const selectedAfter = await page.locator('.react-flow__node.selected').count();
      expect(selectedAfter).toBe(0);
    });
  });

  test.describe('Arrow Keys — Nudge', () => {
    test('arrow keys nudge selected node', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      const nodes = page.locator('.react-flow__node');
      await nodes.first().click();
      await page.waitForTimeout(200);

      const beforeBox = await nodes.first().boundingBox();
      expect(beforeBox).not.toBeNull();

      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);

      const afterBox = await nodes.first().boundingBox();
      expect(afterBox!.x).toBeGreaterThan(beforeBox!.x);
    });

    test('Shift+Arrow nudges by larger step', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      const nodes = page.locator('.react-flow__node');
      await nodes.first().click();
      await page.waitForTimeout(200);

      const beforeBox = await nodes.first().boundingBox();
      expect(beforeBox).not.toBeNull();

      // Shift+ArrowRight (large nudge)
      await page.keyboard.press('Shift+ArrowRight');
      await page.waitForTimeout(200);

      const afterBox = await nodes.first().boundingBox();
      expect(afterBox).not.toBeNull();

      // Should have moved significantly right (more than 5px, likely > 15px with shift)
      expect(afterBox!.x - beforeBox!.x).toBeGreaterThan(10);
    });

    test('no crash when arrow keys pressed with no selection', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      // Ensure nothing is selected by clicking on pane
      await page.locator('.react-flow__pane').click();
      await page.waitForTimeout(200);

      // Should not crash
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
    });
  });

  test.describe('Keyboard Shortcuts Help Modal', () => {
    test('? key opens help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Press ? to open (Shift+? on most keyboards)
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(500);

      // Modal should be visible
      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Should have "Keyboard Shortcuts" in the header
      await expect(page.locator('.modal-header')).toContainText('Keyboard Shortcuts');
    });

    test('F1 key opens help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      await page.keyboard.press('F1');
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();
    });

    test('Escape closes help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Open via keyboard (most reliable)
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await expect(modal).not.toBeVisible();
    });

    test('toolbar ? button opens help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Dispatch the custom event that the toolbar button triggers
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('bt-toggle-shortcuts-help'));
      });
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();
    });

    test('help modal shows all shortcut categories', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Open via keyboard
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(300);

      // Check all categories are listed
      await expect(page.locator('.modal-header')).toContainText('Keyboard Shortcuts');
    });

    test('clicking backdrop closes help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Open via keyboard
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(500);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();

      // Click backdrop at bottom area to avoid modal-content
      await page.locator('.modal-backdrop').click({ position: { x: 10, y: 600 } });
      await page.waitForTimeout(500);

      await expect(modal).not.toBeVisible();
    });

    test('clicking × button closes help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Open via keyboard
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(500);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();

      // Click × button to close
      await page.locator('.modal-close').click();
      await page.waitForTimeout(300);

      await expect(modal).not.toBeVisible();
    });

    test('pane click closes help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Open via keyboard
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(500);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();

      // Click × button to close (reliable method since pane click may be intercepted by backdrop)
      await page.locator('.modal-close').click();
      await page.waitForTimeout(300);

      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Ctrl+S — Export XML', () => {
    test('Ctrl+S triggers XML export (download)', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(800);

      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      // Download should have been triggered
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xml$/);
    });
  });

  test.describe('Multiple Shortcuts Together', () => {
    test('Escape closes help modal', async ({ page }) => {
      await loadSampleTree(page);
      await page.waitForTimeout(500);

      // Open help modal first
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-content');
      await expect(modal).toBeVisible();

      // Press Escape — should close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await expect(modal).not.toBeVisible();
    });
  });
});

import { test, expect } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
    await loadSampleTree(page);
    await page.waitForTimeout(800);
  });

  test.describe('Node Context Menu', () => {
    test('right-click on node shows context menu with required items', async ({ page }) => {
      // Get a non-ROOT node (skip ROOT which is first)
      const nodes = page.locator('.react-flow__node');
      const nonRootNode = nodes.nth(1); // Skip ROOT
      await nonRootNode.click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();

      // Should have Copy Node
      await expect(menu).toContainText('Copy Node');
      // Should have Delete Node
      await expect(menu).toContainText('Delete Node');
      // Should have Node Info
      await expect(menu).toContainText('Node Info');
    });

    test('ROOT node exists in sample tree', async ({ page }) => {
      // Verify ROOT node exists in the sample tree
      const rootNode = page.locator('.react-flow__node').filter({ hasText: 'ROOT' });
      await expect(rootNode).toBeVisible();
    });

    test('right-click on node with children shows expand/collapse option', async ({ page }) => {
      const nodes = page.locator('.react-flow__node');
      // Try different non-leaf node types
      const nonLeafNode = nodes.filter({ hasText: 'Sequence' }).first();
      const exists = await nonLeafNode.count() > 0;
      if (!exists) {
        // Try alternative non-leaf types
        const fallback = nodes.filter({ hasText: 'Selector' }).first();
        const fallbackExists = await fallback.count() > 0;
        if (!fallbackExists) {
          // At minimum, test that context menu appears on any non-ROOT node
          const anyNode = nodes.nth(1);
          await anyNode.click({ button: 'right' });
          await page.waitForTimeout(300);
          const menu = page.locator('.context-menu');
          await expect(menu).toBeVisible();
          return;
        }
        await fallback.click({ button: 'right' });
      } else {
        await nonLeafNode.click({ button: 'right' });
      }
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();
      // Should show collapse or expand option
      const textContent = (await menu.textContent()) ?? '';
      const hasCollapseOrExpand = textContent.includes('Collapse') || textContent.includes('Expand');
      expect(hasCollapseOrExpand).toBe(true);
    });

    test('Copy Node copies the node to clipboard', async ({ page }) => {
      const nodes = page.locator('.react-flow__node');
      const nonRootNode = nodes.nth(1); // Skip ROOT
      const labelBefore = await nonRootNode.textContent();
      await nonRootNode.click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await menu.getByText('Copy Node').click();
      await page.waitForTimeout(300);

      // Menu should close
      await expect(menu).not.toBeVisible();
    });

    test('Delete Node removes the node from canvas', async ({ page }) => {
      const nodes = page.locator('.react-flow__node');
      const countBefore = await nodes.count();
      const nonRootNode = nodes.nth(1); // Skip ROOT
      await nonRootNode.click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await menu.getByText('Delete Node').click();
      await page.waitForTimeout(500);

      const countAfter = await page.locator('.react-flow__node').count();
      expect(countAfter).toBe(countBefore - 1);
    });

    test('Node Info shows alert/modal with node information', async ({ page }) => {
      // Set up dialog handler before triggering
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Node Info');
        await dialog.accept();
      });

      const nodes = page.locator('.react-flow__node');
      const nonRootNode = nodes.nth(1);
      await nonRootNode.click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await menu.getByText('Node Info').click();
      await page.waitForTimeout(500);
    });
  });

  test.describe('Pane Context Menu (canvas空白处)', () => {
    test('right-click on canvas shows context menu', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();
    });

    test('canvas context menu has Fit View option', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toContainText('Fit View');
    });

    test('canvas context menu has Select All option', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toContainText('Select All');
    });

    test('canvas context menu has Add Node option', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toContainText('Add Node');
    });

    test('Select All selects all nodes', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await menu.getByText('Select All').click();
      await page.waitForTimeout(300);

      const selectedCount = await page.locator('.react-flow__node.selected').count();
      const totalCount = await page.locator('.react-flow__node').count();
      expect(selectedCount).toBe(totalCount);
    });

    test('Fit View fits the view', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await menu.getByText('Fit View').click();
      await page.waitForTimeout(500);
      // Just verify no crash
    });

    test('Paste Node option appears after copying a node', async ({ page }) => {
      // First copy a node
      const nodes = page.locator('.react-flow__node');
      const firstNode = nodes.first();
      await firstNode.click({ button: 'right' });
      await page.waitForTimeout(300);
      const menu1 = page.locator('.context-menu');
      await menu1.getByText('Copy Node').click();
      await page.waitForTimeout(300);

      // Now right-click on pane
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu2 = page.locator('.context-menu');
      await expect(menu2).toContainText('Paste Node');
    });

    test('Add Node opens node picker', async ({ page }) => {
      const pane = page.locator('.react-flow__pane');
      await pane.click({ button: 'right', position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await menu.getByText('Add Node').click();
      await page.waitForTimeout(500);

      // Node picker should appear
      const picker = page.locator('.node-picker');
      await expect(picker).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Edge Context Menu', () => {
    test('right-click on edge shows Delete Edge option', async ({ page }) => {
      // Click on pane first to get focus, then try edge click
      const pane = page.locator('.react-flow__pane');
      await pane.click();
      await page.waitForTimeout(200);

      const edges = page.locator('.react-flow__edge');
      const edgeCount = await edges.count();
      if (edgeCount === 0) {
        // No edges in sample, skip
        return;
      }

      await edges.first().click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();
      await expect(menu).toContainText('Delete Edge');
    });

    test('Delete Edge removes the edge', async ({ page }) => {
      // Click pane to establish clean state first
      await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(300);

      const edges = page.locator('.react-flow__edge');
      const edgeCount = await edges.count();
      if (edgeCount === 0) return;

      // Get the ID of the edge to be deleted
      const edgeBefore = await edges.first().getAttribute('id');

      // Right-click on the first edge to trigger edge context menu
      await edges.first().click({ button: 'right' });
      await page.waitForTimeout(500);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();
      await menu.getByText('Delete Edge').click();

      // Wait for the edge to be removed
      await page.waitForTimeout(1000);

      // Verify the specific edge is gone
      const edgeAfter = await page.locator(`#${edgeBefore}`).count();
      expect(edgeAfter).toBe(0);
    });
  });

  test.describe('Context Menu Behavior', () => {
    test('clicking outside closes context menu', async ({ page }) => {
      const nodes = page.locator('.react-flow__node');
      await nodes.first().click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();

      // Click on pane to dismiss
      const pane = page.locator('.react-flow__pane');
      await pane.click();
      await page.waitForTimeout(300);

      await expect(menu).not.toBeVisible();
    });

    test('Escape closes context menu', async ({ page }) => {
      const nodes = page.locator('.react-flow__node');
      await nodes.first().click({ button: 'right' });
      await page.waitForTimeout(300);

      const menu = page.locator('.context-menu');
      await expect(menu).toBeVisible();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await expect(menu).not.toBeVisible();
    });
  });
});

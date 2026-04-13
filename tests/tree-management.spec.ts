import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Tree Management', () => {
  test('添加新树', async ({ page }) => {
    await page.goto('/');

    // Fill in tree name in the TreeManager input
    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('NewTree');

    // Click the + button
    await page.locator('.tree-manager .btn-primary').click();

    // Verify new tree appears in tree manager
    await expect(page.locator('.tree-item', { hasText: 'NewTree' })).toBeVisible();
  });

  test('切换活跃树', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Add a new tree
    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('SecondTree');
    await page.locator('.tree-manager .btn-primary').click();
    await page.waitForTimeout(500);

    // Verify we switched to the new tree (should have only ROOT node)
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBe(1); // Just ROOT

    // Verify new tree is selected
    await expect(page.locator('.tree-item.active')).toContainText('SecondTree');
  });

  test('切换树后画布正确更新', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Sample tree has multiple nodes
    const nodesBefore = await page.locator('.react-flow__node').count();
    expect(nodesBefore).toBeGreaterThan(1);

    // Add new empty tree
    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('EmptyTree');
    await page.locator('.tree-manager .btn-primary').click();
    await page.waitForTimeout(500);

    // New tree should have just ROOT
    const nodesAfter = await page.locator('.react-flow__node').count();
    expect(nodesAfter).toBe(1);
  });

  test('删除非主树', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Add a new tree
    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('DeletableTree');
    await page.locator('.tree-manager .btn-primary').click();
    await page.waitForTimeout(300);

    // Click delete button (✕) on the deletable tree
    const deletableTreeItem = page.locator('.tree-item', { hasText: 'DeletableTree' });
    const deleteBtn = deletableTreeItem.locator('button[title="Delete"]');
    await deleteBtn.click();

    // Verify tree was deleted
    await expect(page.locator('.tree-item', { hasText: 'DeletableTree' })).not.toBeVisible();
  });

  test('设置主树', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Add a new tree
    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('FutureMain');
    await page.locator('.tree-manager .btn-primary').click();
    await page.waitForTimeout(300);

    // Click the ★ button to set as main
    const futureMainItem = page.locator('.tree-item', { hasText: 'FutureMain' });
    const mainBtn = futureMainItem.locator('button[title="Set as main tree"]');
    await mainBtn.click();

    // Verify it now has main tree indicator
    await expect(futureMainItem).toContainText('★');
  });
});

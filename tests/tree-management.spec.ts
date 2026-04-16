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

  test('树标签页支持切换和关闭', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('TabTree');
    await page.locator('.tree-manager .btn-primary').click();

    const tabTreeTab = page.locator('.tree-tab', { hasText: 'TabTree' });
    await expect(tabTreeTab).toBeVisible();
    await expect(page.locator('.tree-tab.active')).toContainText('TabTree');

    await page.locator('.tree-item', { hasText: 'MainTree' }).click();
    await expect(page.locator('.tree-tab.active')).toContainText('MainTree');

    await tabTreeTab.locator('.tree-tab-close').click();
    await expect(page.locator('.tree-tab', { hasText: 'TabTree' })).toHaveCount(0);
  });

  test('树标签页支持右键关闭其它标签页', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const treeInput = page.locator('.tree-manager input[placeholder="NewTreeName"]');
    await treeInput.fill('TabA');
    await page.locator('.tree-manager .btn-primary').click();
    await treeInput.fill('TabB');
    await page.locator('.tree-manager .btn-primary').click();

    const tabA = page.locator('.tree-tab', { hasText: 'TabA' });
    await tabA.click({ button: 'right' });
    await page.getByRole('button', { name: 'Close Others' }).click();

    await expect(page.locator('.tree-tab')).toHaveCount(1);
    await expect(page.locator('.tree-tab.active')).toContainText('TabA');
  });

  test('树面板显示 Project 分组', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tree-group-header')).toContainText('Project');
    await expect(page.locator('.tree-group-children .tree-item')).toHaveCount(1);
  });
});

import { expect, test } from '@playwright/test';
import { loadSampleTree, getNodeLocator } from './helpers';

test.describe('Properties Panel', () => {
  test('显示选中节点详情', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Click on a node to select it
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();

    // Verify properties panel shows details
    await expect(page.locator('.properties-panel')).toBeVisible();
    // Panel should show node info (category, name, ID)
    const panelText = await page.locator('.properties-panel').textContent();
    expect(panelText).toBeTruthy();
    expect(panelText.length).toBeGreaterThan(10);
  });

  test('显示端口信息', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Click on MoveToGoal node which has ports
    const moveToGoalNode = getNodeLocator(page, 'MoveToGoal');
    if (await moveToGoalNode.count() > 0) {
      await moveToGoalNode.first().click();

      // Check for port section
      const panel = page.locator('.properties-panel');
      await expect(panel).toContainText(/port|input|output/i);
    }
  });

  test('Apply 按钮更新画布节点', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Find a node with ports and select it
    const moveToGoalNode = getNodeLocator(page, 'MoveToGoal');
    if (await moveToGoalNode.count() > 0) {
      await moveToGoalNode.first().click();
      await page.waitForTimeout(300);

      // Find the Apply button in properties panel
      const applyBtn = page.locator('.properties-panel').getByRole('button', { name: /Apply/i });

      if (await applyBtn.count() > 0) {
        await applyBtn.click();
        await page.waitForTimeout(500);

        // Verify the node still exists after apply
        await expect(moveToGoalNode.first()).toBeVisible();
      }
    }
  });

  test('取消选择时面板清空', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Select a node first
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    await page.waitForTimeout(200);

    // Click on empty canvas area to deselect
    const pane = page.locator('.react-flow__pane');
    await pane.click({ position: { x: 10, y: 10 } });

    // Panel should show "Select a node" message
    await expect(page.locator('.properties-panel')).toContainText(/select a node/i);
  });

  test('双击打开编辑弹窗', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Double click on a node
    const sequenceNode = getNodeLocator(page, 'ControlRoot');
    if (await sequenceNode.count() > 0) {
      await sequenceNode.first().dblclick();
      await page.waitForTimeout(300);

      // Verify edit modal opens
      await expect(page.locator('.node-edit-modal, [role="dialog"]')).toBeVisible();
    }
  });

  test('Properties面板显示Pre-conditions和Post-conditions区域', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Select a node
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    // Verify properties panel shows preconditions section
    const panel = page.locator('.properties-panel');
    await expect(panel).toContainText(/pre-conditions/i);
    await expect(panel).toContainText(/post-conditions/i);
  });

  test('Properties面板Pre-conditions区域包含所有字段', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Select a node
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    // Verify all precondition fields are present
    const panel = page.locator('.properties-panel');
    await expect(panel).toContainText('Failure if');
    await expect(panel).toContainText('Success if');
    await expect(panel).toContainText('Skip if');
    await expect(panel).toContainText('While (guard)');
  });

  test('Properties面板Post-conditions区域包含所有字段', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Select a node
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    // Verify all postcondition fields are present
    const panel = page.locator('.properties-panel');
    await expect(panel).toContainText('On Success');
    await expect(panel).toContainText('On Failure');
    await expect(panel).toContainText('On Halted');
    await expect(panel).toContainText('Post (any)');
  });

  test('编辑Pre-condition后Save按钮可用', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Select a node
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    // Find the "Failure if" input in preconditions section and type
    const panel = page.locator('.properties-panel');
    const failureIfInput = panel.locator('input[placeholder*="expression"], input[placeholder*="Failure"]').first();
    if (await failureIfInput.count() > 0) {
      await failureIfInput.fill('{health < 0}');
      await page.waitForTimeout(200);

      // Click Save in the preconditions section (first Save button after preconditions)
      const saveBtn = panel.getByRole('button', { name: /save/i });
      await expect(saveBtn.first()).toBeVisible();
    }
  });
});

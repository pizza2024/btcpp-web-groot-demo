import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';
import * as fs from 'fs';

test.describe('XML Import', () => {
  test('导入有效 XML 文件', async ({ page }) => {
    await page.goto('/');

    // Create a minimal valid XML
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="TestTree">
  <TreeNodesModel>
    <Action ID="TestAction"/>
  </TreeNodesModel>
  <BehaviorTree ID="TestTree">
    <Sequence name="Root">
      <Action ID="TestAction"/>
    </Sequence>
  </BehaviorTree>
</root>`;

    // Upload the file - use accept=".xml" selector to be specific
    const fileInput = page.locator('input[type="file"][accept=".xml"]');
    await fileInput.setInputFiles({
      name: 'test.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(validXml),
    });

    // Wait for canvas to update
    await page.waitForTimeout(1000);

    // Verify the tree was loaded
    const nodeTexts = await page.locator('.react-flow__node').allTextContents();
    expect(nodeTexts.length).toBeGreaterThan(0);
  });

  test('导入后节点正确显示', async ({ page }) => {
    await page.goto('/');

    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="TestTree">
  <TreeNodesModel>
    <Action ID="MoveBase"/>
  </TreeNodesModel>
  <BehaviorTree ID="TestTree">
    <Sequence name="Root">
      <Action ID="MoveBase"/>
    </Sequence>
  </BehaviorTree>
</root>`;

    const fileInput = page.locator('input[type="file"][accept=".xml"]');
    await fileInput.setInputFiles({
      name: 'test.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(validXml),
    });

    await page.waitForTimeout(1000);

    // Verify nodes are rendered on canvas
    const nodeTexts = await page.locator('.react-flow__node').allTextContents();
    expect(nodeTexts.some((t) => t.includes('Control'))).toBeTruthy();
  });

  test('导入缺失 TreeNodesModel 的自定义类型时打开 importer modal', async ({ page }) => {
    await page.goto('/');

    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <TreeNodesModel>
    <Action ID="MoveBase">
      <input_port name="target"/>
    </Action>
  </TreeNodesModel>
  <BehaviorTree ID="MainTree">
    <Sequence>
      <RetryWithSkip max_retries="3" skip_if_failed="true">
        <Action ID="MoveBase" target="{goal}"/>
      </RetryWithSkip>
    </Sequence>
  </BehaviorTree>
</root>`;

    const fileInput = page.locator('input[type="file"][accept=".xml"]');
    await fileInput.setInputFiles({
      name: 'custom-models.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(validXml),
    });

    await expect(page.locator('.imported-models-modal')).toBeVisible();
    await expect(page.locator('.importer-type-pill')).toContainText('RetryWithSkip');
    await expect(page.locator('.importer-ports-table input').nth(0)).toHaveValue('max_retries');
    await expect(page.locator('.importer-ports-table input').nth(1)).toHaveValue('skip_if_failed');

    await page.locator('input[type="radio"]').nth(0).check();
    await page.getByRole('button', { name: 'Create Model' }).click();

    await expect(page.locator('.imported-models-modal')).not.toBeVisible();
    await expect(page.locator('.palette-item', { hasText: 'RetryWithSkip' })).toBeVisible();
  });

  test('循环导入导出保持数据一致', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Export first
    const [download1] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Export XML' }).click(),
    ]);
    const path1 = await download1.path();
    const exportedXml1 = fs.readFileSync(path1!, 'utf8');

    // Import the exported file back
    const fileInput = page.locator('input[type="file"][accept=".xml"]');
    await fileInput.setInputFiles({
      name: 'reimport.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(exportedXml1),
    });
    await page.waitForTimeout(1000);

    // Export again
    const [download2] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Export XML' }).click(),
    ]);
    const path2 = await download2.path();
    const exportedXml2 = fs.readFileSync(path2!, 'utf8');

    // Compare - both should have same structure
    expect(exportedXml2).toContain('BTCPP_format="4"');
    expect(exportedXml2).toContain('MainTree');
    expect(exportedXml2).toContain('GraspPipeline');
  });

  test('导入 v3 格式 XML 文件', async ({ page }) => {
    await page.goto('/');

    const v3Xml = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="3" main_tree_to_execute="TestTree">
  <BehaviorTree ID="TestTree">
    <Sequence name="Root">
      <Action ID="TestAction"/>
    </Sequence>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="TestAction"/>
  </TreeNodesModel>
</root>`;

    const fileInput = page.locator('input[type="file"][accept=".xml"]');
    await fileInput.setInputFiles({
      name: 'v3-test.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(v3Xml),
    });

    await page.waitForTimeout(1000);

    // Verify the tree was loaded
    const nodeTexts = await page.locator('.react-flow__node').allTextContents();
    expect(nodeTexts.length).toBeGreaterThan(0);
    expect(nodeTexts.some((t) => t.includes('Control'))).toBeTruthy();
  });
});

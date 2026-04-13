import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

test.describe('XML Export', () => {
  test('导出 XML 文件', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Click export button and wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Export XML' }).click(),
    ]);

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/\.xml$/);

    // Save and read the downloaded file
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const xmlText = fs.readFileSync(downloadPath!, 'utf8');

    // Verify BTCPP_format="4"
    expect(xmlText).toContain('BTCPP_format="4"');

    // Verify main tree
    expect(xmlText).toContain('MainTree');

    // Verify TreeNodesModel section
    expect(xmlText).toContain('<TreeNodesModel>');

    // Verify sample nodes are present
    expect(xmlText).toContain('MoveToGoal');
    expect(xmlText).toContain('CheckBattery');
  });

  test('导出 XML 包含正确的节点结构', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Export XML' }).click(),
    ]);

    const downloadPath = await download.path();
    const xmlContent = fs.readFileSync(downloadPath!, 'utf8');

    // Verify valid XML structure
    expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xmlContent).toContain('<root BTCPP_format="4"');
    expect(xmlContent).toContain('</root>');

    // Verify BehaviorTree tags
    expect(xmlContent).toContain('<BehaviorTree ID="MainTree">');
    expect(xmlContent).toContain('<BehaviorTree ID="GraspPipeline">');
  });

  test('导出文件名使用主树名称', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Export XML' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('MainTree.xml');
  });
});

import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';
import * as fs from 'fs';

test.describe('SubTree Port Remapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('SubTree node can be added to canvas', async ({ page }) => {
    // Drag SubTree from palette to canvas
    const subtreePalette = page.locator('.palette-item', { hasText: 'SubTree' }).first();
    const pane = page.locator('.react-flow__pane');
    await subtreePalette.dragTo(pane, { targetPosition: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Verify SubTree node appears on canvas
    const subtreeNode = page.locator('.react-flow__node', { hasText: 'SubTree' });
    await expect(subtreeNode).toBeVisible();
  });

  test('SubTree node edit modal shows auto-remap option', async ({ page }) => {
    // Add SubTree to canvas
    const subtreePalette = page.locator('.palette-item', { hasText: 'SubTree' }).first();
    const pane = page.locator('.react-flow__pane');
    await subtreePalette.dragTo(pane, { targetPosition: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Double click to open edit modal
    const subtreeNode = page.locator('.react-flow__node', { hasText: 'SubTree' }).first();
    await subtreeNode.dblclick();
    await page.waitForTimeout(300);

    // Verify modal opens
    const modal = page.locator('.node-edit-modal');
    await expect(modal).toBeVisible();

    // Verify auto-remap checkbox exists
    const autoRemapLabel = page.locator('.checkbox-label', { hasText: 'Auto-remap' });
    await expect(autoRemapLabel).toBeVisible();
  });

  test('SubTree modal has tree selection dropdown', async ({ page }) => {
    // Add SubTree to canvas
    const subtreePalette = page.locator('.palette-item', { hasText: 'SubTree' }).first();
    const pane = page.locator('.react-flow__pane');
    await subtreePalette.dragTo(pane, { targetPosition: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Open edit modal
    const subtreeNode = page.locator('.react-flow__node', { hasText: 'SubTree' }).first();
    await subtreeNode.dblclick();
    await page.waitForTimeout(300);

    // Verify ModelName dropdown exists with -- Select Tree -- option
    const select = page.locator('.node-edit-modal select');
    await expect(select).toBeVisible();
    await expect(select.locator('option[value=""]')).toContainText('-- Select Tree --');
  });

  test('XML export includes valid structure', async ({ page }) => {
    await loadSampleTree(page);

    // Export XML
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Export XML' }).click(),
    ]);

    const path = await download.path();
    const xmlContent = fs.readFileSync(path!, 'utf8');

    // Verify valid XML structure
    expect(xmlContent).toContain('BTCPP_format="4"');
    expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xmlContent).toContain('<root');
    expect(xmlContent).toContain('</root>');
  });
});

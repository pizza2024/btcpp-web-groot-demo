import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

test.describe('PNG Export', () => {
  test('导出 PNG 图片', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    // Click export PNG button and wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '🖼️ Export PNG' }).click(),
    ]);

    // Verify filename ends with .png
    expect(download.suggestedFilename()).toMatch(/\.png$/);

    // Save and verify the downloaded file
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Verify it's a valid PNG file (PNG files start with PNG signature)
    const fileBuffer = fs.readFileSync(downloadPath!);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(fileBuffer.slice(0, 8)).toEqual(pngSignature);
  });

  test('导出 PNG 文件名使用当前树名称', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '🖼️ Export PNG' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('MainTree.png');
  });

  test('Export PNG 按钮存在且可点击', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const exportButton = page.getByRole('button', { name: '🖼️ Export PNG' });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('导出 PNG 后下载完成且文件有效', async ({ page }) => {
    await page.goto('/');
    await loadSampleTree(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '🖼️ Export PNG' }).click(),
    ]);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Verify file is not empty (at least the PNG header)
    const stats = fs.statSync(downloadPath!);
    expect(stats.size).toBeGreaterThan(100);
  });
});

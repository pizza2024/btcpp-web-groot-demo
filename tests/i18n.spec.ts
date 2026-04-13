import { test, expect } from '@playwright/test';

test.describe('i18n - Language Switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('language switcher button exists', async ({ page }) => {
    // Find language switcher button (contains EN or 中文)
    const langBtn = page.locator('button:has-text("EN"), button:has-text("中文")');
    await expect(langBtn).toBeVisible();
  });

  test('clicking language switch changes the button text', async ({ page }) => {
    const langBtn = page.locator('button:has-text("EN"), button:has-text("中文")').first();
    await expect(langBtn).toBeVisible();

    const initialText = await langBtn.textContent();
    
    // Click to switch language
    await langBtn.click();
    await page.waitForTimeout(300);

    // Text should change
    const newText = await langBtn.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('toolbar buttons show correct text in English', async ({ page }) => {
    // Ensure English is selected
    const langBtn = page.locator('button:has-text("EN"), button:has-text("中文")').first();
    const currentText = await langBtn.textContent();
    if (currentText?.includes('中文')) {
      await langBtn.click();
      await page.waitForTimeout(300);
    }

    // Check toolbar buttons show English text (use first() to avoid strict mode)
    await expect(page.getByRole('button', { name: '📂 Sample' })).toBeVisible();
    await expect(page.getByRole('button', { name: '⬇ Export XML' })).toBeVisible();
  });

  test('toolbar buttons show correct text in Chinese', async ({ page }) => {
    // Switch to Chinese
    const langBtn = page.locator('button:has-text("EN"), button:has-text("中文")').first();
    const currentText = await langBtn.textContent();
    if (currentText?.includes('EN')) {
      await langBtn.click();
      await page.waitForTimeout(300);
    }

    // Check toolbar buttons show Chinese text
    await expect(page.getByRole('button', { name: '📂 示例' })).toBeVisible();
    await expect(page.getByRole('button', { name: '⬇ 导出 XML' })).toBeVisible();
  });

  test('language preference persists after reload', async ({ page }) => {
    // Switch to Chinese
    const langBtn = page.locator('button:has-text("EN"), button:has-text("中文")').first();
    await langBtn.click();
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForSelector('.react-flow');

    // Language should still be Chinese
    const newLangBtn = page.locator('button:has-text("EN"), button:has-text("中文")').first();
    await expect(newLangBtn).toContainText('中文');
  });
});

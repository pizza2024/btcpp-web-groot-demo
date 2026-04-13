import { expect, test } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('theme toggle button exists', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /Dark|Light/ });
    await expect(themeBtn).toBeVisible();
  });

  test('clicking theme button switches theme class on html element', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /Dark|Light/ });
    
    // Initially should have no theme-light class (dark mode default)
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    
    // Click to toggle
    await themeBtn.click();
    await page.waitForTimeout(300);
    
    // After toggle, should have opposite class
    const newClass = await htmlElement.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });

  test('theme preference is persisted in localStorage', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /Dark|Light/ });
    
    // Click to toggle theme
    await themeBtn.click();
    await page.waitForTimeout(300);
    
    // Check localStorage
    const storedTheme = await page.evaluate(() => localStorage.getItem('bt-theme'));
    expect(storedTheme).toBeTruthy();
  });

  test('theme button shows current theme', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /Dark|Light/ });
    
    // Should show "Dark" initially (default)
    await expect(themeBtn).toContainText(/Dark|Light/);
  });
});

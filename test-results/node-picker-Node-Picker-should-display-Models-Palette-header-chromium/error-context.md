# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: node-picker.spec.ts >> Node Picker >> should display Models Palette header
- Location: tests/node-picker.spec.ts:10:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.react-flow') to be visible

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - img "robot" [ref=e8]:
      - img [ref=e9]
    - heading "机器人后台管理系统" [level=1] [ref=e11]
    - paragraph [ref=e12]: 请输入账号信息登录系统
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e21]:
        - img "user" [ref=e23]:
          - img [ref=e24]
        - textbox "请输入用户名" [ref=e26]
      - generic [ref=e32]:
        - img "lock" [ref=e34]:
          - img [ref=e35]
        - textbox "请输入密码" [ref=e37]
        - img "eye-invisible" [ref=e39] [cursor=pointer]:
          - img [ref=e40]
      - generic [ref=e43]:
        - generic [ref=e44] [cursor=pointer]:
          - checkbox "记住我" [checked] [ref=e46]
          - generic [ref=e47]: 记住我
        - button "忘记密码" [ref=e48] [cursor=pointer]:
          - generic [ref=e49]: 忘记密码
      - button "登 录" [ref=e55] [cursor=pointer]:
        - generic [ref=e56]: 登 录
    - generic [ref=e57]:
      - generic [ref=e58]: 还没有账号？
      - button "立即注册" [ref=e59] [cursor=pointer]:
        - generic [ref=e60]: 立即注册
  - paragraph [ref=e61]: © 2026 机器人质检管理系统
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Node Picker', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |     // Wait for the app to load
> 7  |     await page.waitForSelector('.react-flow');
     |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  8  |   });
  9  | 
  10 |   test('should display Models Palette header', async ({ page }) => {
  11 |     const paletteHeader = page.locator('.panel-header', { hasText: 'Models Palette' });
  12 |     await expect(paletteHeader).toBeVisible();
  13 |   });
  14 | 
  15 |   test('should have Action category in palette', async ({ page }) => {
  16 |     // Check that Action category is visible in palette
  17 |     const actionCategory = page.locator('.cat-header', { hasText: 'Action' });
  18 |     await expect(actionCategory).toBeVisible();
  19 |   });
  20 | 
  21 |   test('should open edit modal on node double-click', async ({ page }) => {
  22 |     // Find and double-click a node (Sequence from Control category)
  23 |     const sequenceNode = page.locator('.react-flow__node').filter({ hasText: 'Sequence' }).first();
  24 |     
  25 |     if (await sequenceNode.isVisible()) {
  26 |       await sequenceNode.dblclick();
  27 |       
  28 |       // Check modal appears
  29 |       const modal = page.locator('.node-edit-modal');
  30 |       await expect(modal).toBeVisible();
  31 |     }
  32 |   });
  33 | 
  34 |   test('should display node picker styles in CSS', async ({ page }) => {
  35 |     // Verify the node-picker CSS class exists
  36 |     const pickerStyle = page.locator('.node-picker');
  37 |     // The picker itself won't be visible until triggered
  38 |     // But we can verify the element doesn't throw errors
  39 |   });
  40 | 
  41 |   test('all node types should have rectangular shape', async ({ page }) => {
  42 |     // All nodes should have border-radius style making them rectangular
  43 |     // Check that Decorator nodes are no longer circular
  44 |     const decoratorNode = page.locator('.react-flow__node').filter({ hasText: 'Inverter' });
  45 |     // Inverter is a Decorator - it should now be rectangular, not circular
  46 |   });
  47 | });
  48 | 
```
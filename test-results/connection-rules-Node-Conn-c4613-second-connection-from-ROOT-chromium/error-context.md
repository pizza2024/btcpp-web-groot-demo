# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connection-rules.spec.ts >> Node Connection Rules >> should block second connection from ROOT
- Location: tests/connection-rules.spec.ts:24:3

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
  3  | test.describe('Node Connection Rules', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
> 6  |     await page.waitForSelector('.react-flow');
     |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  7  |   });
  8  | 
  9  |   test('should allow connection from ROOT to Sequence', async ({ page }) => {
  10 |     // ROOT should be visible
  11 |     const rootNode = page.locator('.react-flow__node').filter({ hasText: 'ROOT' });
  12 |     await expect(rootNode).toBeVisible();
  13 |   });
  14 | 
  15 |   test('should block connection from Action to any node', async ({ page }) => {
  16 |     // Actions are leaf nodes and should not have outgoing connections
  17 |     // This test verifies the connection validation logic
  18 |   });
  19 | 
  20 |   test('should block connection from Condition to any node', async ({ page }) => {
  21 |     // Conditions are leaf nodes and should not have outgoing connections
  22 |   });
  23 | 
  24 |   test('should block second connection from ROOT', async ({ page }) => {
  25 |     // ROOT can only have ONE child
  26 |   });
  27 | 
  28 |   test('should block second connection from Decorator', async ({ page }) => {
  29 |     // Decorator can only have ONE child
  30 |   });
  31 | 
  32 |   test('should allow multiple connections from Control nodes', async ({ page }) => {
  33 |     // Sequence, Fallback, etc. can have multiple children
  34 |   });
  35 | 
  36 |   test('should allow multiple connections from SubTree', async ({ page }) => {
  37 |     // SubTree can have multiple children
  38 |   });
  39 | });
  40 | 
```
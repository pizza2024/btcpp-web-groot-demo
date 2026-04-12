# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: xml-import.spec.ts >> XML Import >> 循环导入导出保持数据一致
- Location: tests/xml-import.spec.ts:67:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '📂 Sample' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:oxc] Transform failed with 1 error: [PARSE_ERROR] Error: Unterminated regular expression ╭─[ src/components/NodeEditModal.tsx:332:6 ] │ 332 │ </div> │ ───┬── │ ╰──── ─────╯"
  - generic [ref=e5]: /Users/pizza/workspace/btcpp-web-groot-demo/src/components/NodeEditModal.tsx
  - generic [ref=e6]: at transformWithOxc (file:///Users/pizza/workspace/btcpp-web-groot-demo/node_modules/vite/dist/node/chunks/node.js:3745:19) at TransformPluginContext.transform (file:///Users/pizza/workspace/btcpp-web-groot-demo/node_modules/vite/dist/node/chunks/node.js:3813:26) at EnvironmentPluginContainer.transform (file:///Users/pizza/workspace/btcpp-web-groot-demo/node_modules/vite/dist/node/chunks/node.js:30143:51) at async loadAndTransform (file:///Users/pizza/workspace/btcpp-web-groot-demo/node_modules/vite/dist/node/chunks/node.js:24468:26) at async viteTransformMiddleware (file:///Users/pizza/workspace/btcpp-web-groot-demo/node_modules/vite/dist/node/chunks/node.js:24262:20)
  - generic [ref=e7]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e8]: server.hmr.overlay
    - text: to
    - code [ref=e9]: "false"
    - text: in
    - code [ref=e10]: vite.config.ts
    - text: .
```

# Test source

```ts
  1  | import { type Page } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Load the sample tree by clicking the Sample button and waiting for canvas update
  5  |  */
  6  | export async function loadSampleTree(page: Page): Promise<void> {
> 7  |   await page.getByRole('button', { name: '📂 Sample' }).click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  8  |   await page.waitForTimeout(1000);
  9  | }
  10 | 
  11 | /**
  12 |  * Wait for canvas to be ready with nodes
  13 |  */
  14 | export async function waitForCanvasReady(page: Page): Promise<void> {
  15 |   const pane = page.locator('.react-flow__pane');
  16 |   await expect(pane).toBeVisible({ timeout: 10000 });
  17 | }
  18 | 
  19 | /**
  20 |  * Drag a palette item to the canvas
  21 |  */
  22 | export async function dragNodeToCanvas(
  23 |   page: Page,
  24 |   nodeText: string,
  25 |   x: number,
  26 |   y: number
  27 | ): Promise<void> {
  28 |   const paletteItem = page.locator('.palette-item', { hasText: nodeText }).first();
  29 |   const pane = page.locator('.react-flow__pane');
  30 |   await paletteItem.dragTo(pane, { targetPosition: { x, y } });
  31 |   await page.waitForTimeout(500);
  32 | }
  33 | 
  34 | /**
  35 |  * Get a node by its label text
  36 |  */
  37 | export function getNodeLocator(page: Page, label: string) {
  38 |   return page.locator('.react-flow__node', { hasText: label });
  39 | }
  40 | 
```
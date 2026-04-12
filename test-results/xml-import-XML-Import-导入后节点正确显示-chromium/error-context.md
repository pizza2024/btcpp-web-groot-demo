# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: xml-import.spec.ts >> XML Import >> 导入后节点正确显示
- Location: tests/xml-import.spec.ts:38:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.setInputFiles: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="file"][accept=".xml"]')

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
  1   | import { expect, test } from '@playwright/test';
  2   | import { loadSampleTree } from './helpers';
  3   | import * as fs from 'fs';
  4   | 
  5   | test.describe('XML Import', () => {
  6   |   test('导入有效 XML 文件', async ({ page }) => {
  7   |     await page.goto('/');
  8   | 
  9   |     // Create a minimal valid XML
  10  |     const validXml = `<?xml version="1.0" encoding="UTF-8"?>
  11  | <root BTCPP_format="4" main_tree_to_execute="TestTree">
  12  |   <TreeNodesModel>
  13  |     <Action ID="TestAction"/>
  14  |   </TreeNodesModel>
  15  |   <BehaviorTree ID="TestTree">
  16  |     <Sequence name="Root">
  17  |       <Action ID="TestAction"/>
  18  |     </Sequence>
  19  |   </BehaviorTree>
  20  | </root>`;
  21  | 
  22  |     // Upload the file - use accept=".xml" selector to be specific
  23  |     const fileInput = page.locator('input[type="file"][accept=".xml"]');
  24  |     await fileInput.setInputFiles({
  25  |       name: 'test.xml',
  26  |       mimeType: 'text/xml',
  27  |       buffer: Buffer.from(validXml),
  28  |     });
  29  | 
  30  |     // Wait for canvas to update
  31  |     await page.waitForTimeout(1000);
  32  | 
  33  |     // Verify the tree was loaded
  34  |     const nodeTexts = await page.locator('.react-flow__node').allTextContents();
  35  |     expect(nodeTexts.length).toBeGreaterThan(0);
  36  |   });
  37  | 
  38  |   test('导入后节点正确显示', async ({ page }) => {
  39  |     await page.goto('/');
  40  | 
  41  |     const validXml = `<?xml version="1.0" encoding="UTF-8"?>
  42  | <root BTCPP_format="4" main_tree_to_execute="TestTree">
  43  |   <TreeNodesModel>
  44  |     <Action ID="MoveBase"/>
  45  |   </TreeNodesModel>
  46  |   <BehaviorTree ID="TestTree">
  47  |     <Sequence name="Root">
  48  |       <Action ID="MoveBase"/>
  49  |     </Sequence>
  50  |   </BehaviorTree>
  51  | </root>`;
  52  | 
  53  |     const fileInput = page.locator('input[type="file"][accept=".xml"]');
> 54  |     await fileInput.setInputFiles({
      |     ^ Error: locator.setInputFiles: Test timeout of 30000ms exceeded.
  55  |       name: 'test.xml',
  56  |       mimeType: 'text/xml',
  57  |       buffer: Buffer.from(validXml),
  58  |     });
  59  | 
  60  |     await page.waitForTimeout(1000);
  61  | 
  62  |     // Verify nodes are rendered on canvas
  63  |     const nodeTexts = await page.locator('.react-flow__node').allTextContents();
  64  |     expect(nodeTexts.some((t) => t.includes('Control'))).toBeTruthy();
  65  |   });
  66  | 
  67  |   test('循环导入导出保持数据一致', async ({ page }) => {
  68  |     await page.goto('/');
  69  |     await loadSampleTree(page);
  70  | 
  71  |     // Export first
  72  |     const [download1] = await Promise.all([
  73  |       page.waitForEvent('download'),
  74  |       page.getByRole('button', { name: '⬇ Export XML' }).click(),
  75  |     ]);
  76  |     const path1 = await download1.path();
  77  |     const exportedXml1 = fs.readFileSync(path1!, 'utf8');
  78  | 
  79  |     // Import the exported file back
  80  |     const fileInput = page.locator('input[type="file"][accept=".xml"]');
  81  |     await fileInput.setInputFiles({
  82  |       name: 'reimport.xml',
  83  |       mimeType: 'text/xml',
  84  |       buffer: Buffer.from(exportedXml1),
  85  |     });
  86  |     await page.waitForTimeout(1000);
  87  | 
  88  |     // Export again
  89  |     const [download2] = await Promise.all([
  90  |       page.waitForEvent('download'),
  91  |       page.getByRole('button', { name: '⬇ Export XML' }).click(),
  92  |     ]);
  93  |     const path2 = await download2.path();
  94  |     const exportedXml2 = fs.readFileSync(path2!, 'utf8');
  95  | 
  96  |     // Compare - both should have same structure
  97  |     expect(exportedXml2).toContain('BTCPP_format="4"');
  98  |     expect(exportedXml2).toContain('MainTree');
  99  |     expect(exportedXml2).toContain('GraspPipeline');
  100 |   });
  101 | });
  102 | 
```
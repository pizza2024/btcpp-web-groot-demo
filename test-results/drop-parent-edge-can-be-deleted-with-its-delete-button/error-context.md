# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: drop-parent.spec.ts >> edge can be deleted with its delete button
- Location: tests/e2e/drop-parent.spec.ts:61:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.react-flow__edge').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.react-flow__edge').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: 🌳 BT Editor
    - button "📂 Sample" [active] [ref=e7] [cursor=pointer]
    - button "⬆ Import XML" [ref=e8] [cursor=pointer]
    - button "⬇ Export XML" [ref=e9] [cursor=pointer]
    - generic [ref=e11]: "Tree: MainTree★ main"
    - generic [ref=e12]: Drag nodes from palette → canvas · Connect nodes · Double-click to rename
  - generic [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Node Palette
        - generic [ref=e17]:
          - button "▼ Control 8" [ref=e18] [cursor=pointer]:
            - generic [ref=e19]: ▼ Control
            - generic [ref=e20]: "8"
          - generic [ref=e21]:
            - generic "All children must succeed (→)" [ref=e22]:
              - generic [ref=e23]: Sequence
            - generic "First success wins (?)" [ref=e24]:
              - generic [ref=e25]: Fallback
            - generic "Run children in parallel" [ref=e26]:
              - generic [ref=e27]: Parallel
            - generic "Re-checks previous on RUNNING" [ref=e28]:
              - generic [ref=e29]: ReactiveSequence
            - generic "Re-checks previous on RUNNING" [ref=e30]:
              - generic [ref=e31]: ReactiveFallback
            - generic "While[0] do[1] else[2]" [ref=e32]:
              - generic [ref=e33]: WhileDoElse
            - generic "If[0] then[1] else[2]" [ref=e34]:
              - generic [ref=e35]: IfThenElse
            - generic "Switch on variable (2 cases)" [ref=e36]:
              - generic [ref=e37]: Switch2
        - generic [ref=e38]:
          - button "▼ Decorator 9" [ref=e39] [cursor=pointer]:
            - generic [ref=e40]: ▼ Decorator
            - generic [ref=e41]: "9"
          - generic [ref=e42]:
            - generic "Invert child result" [ref=e43]:
              - generic [ref=e44]: Inverter
            - generic "Always SUCCESS" [ref=e45]:
              - generic [ref=e46]: ForceSuccess
            - generic "Always FAILURE" [ref=e47]:
              - generic [ref=e48]: ForceFailure
            - generic "Loop until FAILURE" [ref=e49]:
              - generic [ref=e50]: KeepRunningUntilFailure
            - generic "Repeat N times" [ref=e51]:
              - generic [ref=e52]: Repeat
            - generic "Retry until SUCCESS" [ref=e53]:
              - generic [ref=e54]: RetryUntilSuccessful
            - generic "Cancel after timeout" [ref=e55]:
              - generic [ref=e56]: Timeout
            - generic "Delay then tick" [ref=e57]:
              - generic [ref=e58]: Delay
            - generic "Tick child only once" [ref=e59]:
              - generic [ref=e60]: RunOnce
        - generic [ref=e61]:
          - button "▼ Leaf 6" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]: ▼ Leaf
            - generic [ref=e64]: "6"
          - generic [ref=e65]:
            - generic "MoveToGoal" [ref=e66]:
              - generic [ref=e67]: MoveToGoal
              - button "✕" [ref=e68] [cursor=pointer]
            - generic "OpenGripper" [ref=e69]:
              - generic [ref=e70]: OpenGripper
              - button "✕" [ref=e71] [cursor=pointer]
            - generic "ApproachObject" [ref=e72]:
              - generic [ref=e73]: ApproachObject
              - button "✕" [ref=e74] [cursor=pointer]
            - generic "CloseGripper" [ref=e75]:
              - generic [ref=e76]: CloseGripper
              - button "✕" [ref=e77] [cursor=pointer]
            - generic "CheckBattery" [ref=e78]:
              - generic [ref=e79]: CheckBattery
              - button "✕" [ref=e80] [cursor=pointer]
            - generic "IsAtGoal" [ref=e81]:
              - generic [ref=e82]: IsAtGoal
              - button "✕" [ref=e83] [cursor=pointer]
        - generic [ref=e84]:
          - button "▼ SubTree 1" [ref=e85] [cursor=pointer]:
            - generic [ref=e86]: ▼ SubTree
            - generic [ref=e87]: "1"
          - generic "Reference to another tree" [ref=e89]:
            - generic [ref=e90]: SubTree
        - generic [ref=e91]:
          - generic [ref=e92]: Add Custom Node
          - textbox "NodeTypeName" [ref=e93]
          - combobox [ref=e94]:
            - option "Action / Condition" [selected]
            - option "Control"
            - option "Decorator"
          - button "+ Add Node" [ref=e95] [cursor=pointer]
      - generic [ref=e96]:
        - generic [ref=e97]: Behavior Trees
        - generic [ref=e98]:
          - generic [ref=e99] [cursor=pointer]:
            - generic [ref=e100]: ★MainTree
            - generic [ref=e101]:
              - button "✎" [ref=e102]
              - button "✕" [ref=e103]
          - generic [ref=e104] [cursor=pointer]:
            - generic [ref=e105]: GraspPipeline
            - generic [ref=e106]:
              - button "★" [ref=e107]
              - button "✎" [ref=e108]
              - button "✕" [ref=e109]
        - generic [ref=e110]:
          - textbox "NewTreeName" [ref=e111]
          - button "+" [ref=e112] [cursor=pointer]
    - application [ref=e115]:
      - group [ref=e118]:
        - generic [ref=e119]:
          - generic [ref=e122]: Control
          - generic [ref=e123]: Sequence
      - img
      - generic "Control Panel" [ref=e124]:
        - button "Zoom In" [disabled]:
          - img
        - button "Zoom Out" [ref=e125] [cursor=pointer]:
          - img [ref=e126]
        - button "Fit View" [ref=e128] [cursor=pointer]:
          - img [ref=e129]
        - button "Toggle Interactivity" [ref=e131] [cursor=pointer]:
          - img [ref=e132]
      - img "Mini Map" [ref=e135]
    - generic [ref=e138]:
      - generic [ref=e139]:
        - generic [ref=e140]: Properties
        - generic [ref=e141]: Select a node on the canvas to view its properties.
      - generic [ref=e142]:
        - generic [ref=e143]: Debug / Log Replay
        - generic [ref=e144]:
          - button "Sample Log" [ref=e145] [cursor=pointer]
          - button "Load File" [ref=e146] [cursor=pointer]
          - button "Paste Log" [ref=e147] [cursor=pointer]
        - generic [ref=e148]:
          - text: No debug log loaded.
          - text: Load a log file or use the sample to replay a BT execution.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('dropped node stays on canvas without auto-connecting an edge', async ({ page }) => {
  4  |   await page.goto('/');
  5  | 
  6  |   const nodeNameInput = page.getByPlaceholder('NodeTypeName');
  7  |   await nodeNameInput.fill('E2EAction');
  8  |   await page.getByRole('button', { name: '+ Add Node' }).click();
  9  | 
  10 |   const paletteItem = page.locator('.palette-item', { hasText: 'E2EAction' }).first();
  11 |   const pane = page.locator('.react-flow__pane');
  12 |   const edges = page.locator('.react-flow__edge');
  13 |   await expect(paletteItem).toBeVisible();
  14 |   await expect(pane).toBeVisible();
  15 |   await expect(edges).toHaveCount(0);
  16 | 
  17 |   await paletteItem.dragTo(pane, {
  18 |     targetPosition: { x: 420, y: 220 },
  19 |   });
  20 | 
  21 |   await page.waitForTimeout(1200);
  22 | 
  23 |   const droppedNode = page.locator('.react-flow__node', { hasText: 'E2EAction' });
  24 |   await expect(droppedNode).toHaveCount(1);
  25 |   await expect(edges).toHaveCount(0);
  26 | });
  27 | 
  28 | test('dragged node keeps its manual position after autosave delay', async ({ page }) => {
  29 |   await page.goto('/');
  30 | 
  31 |   const node = page.locator('.react-flow__node').first();
  32 |   await expect(node).toBeVisible();
  33 | 
  34 |   const beforeBox = await node.boundingBox();
  35 |   expect(beforeBox).not.toBeNull();
  36 | 
  37 |   if (!beforeBox) {
  38 |     throw new Error('Node bounding box not available before drag');
  39 |   }
  40 | 
  41 |   await page.mouse.move(beforeBox.x + beforeBox.width / 2, beforeBox.y + beforeBox.height / 2);
  42 |   await page.mouse.down();
  43 |   await page.mouse.move(beforeBox.x + beforeBox.width / 2 + 140, beforeBox.y + beforeBox.height / 2 + 120, {
  44 |     steps: 8,
  45 |   });
  46 |   await page.mouse.up();
  47 | 
  48 |   await page.waitForTimeout(1200);
  49 | 
  50 |   const afterBox = await node.boundingBox();
  51 |   expect(afterBox).not.toBeNull();
  52 | 
  53 |   if (!afterBox) {
  54 |     throw new Error('Node bounding box not available after drag');
  55 |   }
  56 | 
  57 |   expect(afterBox.x).toBeGreaterThan(beforeBox.x + 80);
  58 |   expect(afterBox.y).toBeGreaterThan(beforeBox.y + 60);
  59 | });
  60 | 
  61 | test('edge can be deleted with its delete button', async ({ page }) => {
  62 |   await page.goto('/');
  63 |   await page.getByRole('button', { name: '📂 Sample' }).click();
  64 | 
  65 |   const edges = page.locator('.react-flow__edge');
> 66 |   await expect(edges.first()).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  67 | 
  68 |   const countBefore = await edges.count();
  69 |   await page.locator('.bt-edge-delete').first().click({ force: true });
  70 |   await page.waitForTimeout(1200);
  71 | 
  72 |   await expect(edges).toHaveCount(countBefore - 1);
  73 | });
  74 | 
```
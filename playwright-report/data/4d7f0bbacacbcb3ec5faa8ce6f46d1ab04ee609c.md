# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reviewer-testing.spec.ts >> 【并发删除场景测试】 >> D1-同时删除多个节点: 删除B和C，A的子节点关系正确
- Location: tests/reviewer-testing.spec.ts:465:3

# Error details

```
TypeError: page.keyboard is not a function
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: 🌳 BT Editor
    - button "📂 Sample" [ref=e7] [cursor=pointer]
    - button "⬆ Import XML" [ref=e8] [cursor=pointer]
    - button "⬇ Export XML" [ref=e9] [cursor=pointer]
    - button "🖼️ Export PNG" [ref=e10] [cursor=pointer]
    - button "?" [ref=e11] [cursor=pointer]
    - generic [ref=e13]:
      - text: "Tree: MainTree"
      - generic [ref=e14]: ★ MainTree
    - button "🇺🇸 EN" [ref=e15] [cursor=pointer]
    - button "🌙 Dark" [ref=e16] [cursor=pointer]
    - generic [ref=e17]: Drag nodes from palette → canvas · Connect nodes · Double-click to rename
  - generic [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: Models Palette
          - generic [ref=e23]: ▼
        - textbox "Search models..." [ref=e25]
        - generic [ref=e26]:
          - button "▼ Action 7" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: ▼ Action
            - generic [ref=e29]: "7"
          - generic [ref=e30]:
            - generic "Always return FAILURE" [ref=e32]:
              - generic [ref=e33]: AlwaysFailure
            - generic "Always return SUCCESS" [ref=e35]:
              - generic [ref=e36]: AlwaysSuccess
            - generic "Execute script" [ref=e38]:
              - generic [ref=e39]: Script
            - generic "Set a blackboard value" [ref=e41]:
              - generic [ref=e42]: SetBlackboard
            - generic "Sleep for specified time" [ref=e44]:
              - generic [ref=e45]: Sleep
            - generic "Unset a blackboard entry" [ref=e47]:
              - generic [ref=e48]: UnsetBlackboard
            - generic "Check if blackboard entry was updated" [ref=e50]:
              - generic [ref=e51]: WasEntryUpdated
        - generic [ref=e52]:
          - button "▼ Condition 1" [ref=e53] [cursor=pointer]:
            - generic [ref=e54]: ▼ Condition
            - generic [ref=e55]: "1"
          - generic "Evaluate script as condition" [ref=e58]:
            - generic [ref=e59]: ScriptCondition
        - generic [ref=e60]:
          - button "▼ Control 18" [ref=e61] [cursor=pointer]:
            - generic [ref=e62]: ▼ Control
            - generic [ref=e63]: "18"
          - generic [ref=e64]:
            - generic "Async fallback" [ref=e66]:
              - generic [ref=e67]: AsyncFallback
            - generic "Async sequence" [ref=e69]:
              - generic [ref=e70]: AsyncSequence
            - generic "First success wins (?)" [ref=e72]:
              - generic [ref=e73]: Fallback
            - generic "If[0] then[1] else[2]" [ref=e75]:
              - generic [ref=e76]: IfThenElse
            - generic "Manually select which child to run" [ref=e78]:
              - generic [ref=e79]: ManualSelector
            - generic "Run children in parallel" [ref=e81]:
              - generic [ref=e82]: Parallel
            - generic "All children must succeed or fail together" [ref=e84]:
              - generic [ref=e85]: ParallelAll
            - generic "Re-checks previous on RUNNING" [ref=e87]:
              - generic [ref=e88]: ReactiveFallback
            - generic "Re-checks previous on RUNNING" [ref=e90]:
              - generic [ref=e91]: ReactiveSequence
            - generic "All children must succeed (→)" [ref=e93]:
              - generic [ref=e94]: Sequence
            - generic "Sequence that remembers last running child" [ref=e96]:
              - generic [ref=e97]: SequenceWithMemory
            - generic "Switch on variable (2 cases)" [ref=e99]:
              - generic [ref=e100]: Switch2
            - generic "Switch on variable (3 cases)" [ref=e102]:
              - generic [ref=e103]: Switch3
            - generic "Switch on variable (4 cases)" [ref=e105]:
              - generic [ref=e106]: Switch4
            - generic "Switch on variable (5 cases)" [ref=e108]:
              - generic [ref=e109]: Switch5
            - generic "Switch on variable (6 cases)" [ref=e111]:
              - generic [ref=e112]: Switch6
            - generic "Try...catch pattern" [ref=e114]:
              - generic [ref=e115]: TryCatch
            - generic "While[0] do[1] else[2]" [ref=e117]:
              - generic [ref=e118]: WhileDoElse
        - generic [ref=e119]:
          - button "▼ Decorator 16" [ref=e120] [cursor=pointer]:
            - generic [ref=e121]: ▼ Decorator
            - generic [ref=e122]: "16"
          - generic [ref=e123]:
            - generic "Delay before ticking child" [ref=e125]:
              - generic [ref=e126]: Delay
            - generic "Always FAILURE" [ref=e128]:
              - generic [ref=e129]: ForceFailure
            - generic "Always SUCCESS" [ref=e131]:
              - generic [ref=e132]: ForceSuccess
            - generic "Invert child result" [ref=e134]:
              - generic [ref=e135]: Inverter
            - generic "Loop until FAILURE" [ref=e137]:
              - generic [ref=e138]: KeepRunningUntilFailure
            - generic "Loop over boolean queue" [ref=e140]:
              - generic [ref=e141]: LoopBool
            - generic "Loop over double/float queue" [ref=e143]:
              - generic [ref=e144]: LoopDouble
            - generic "Loop over integer queue" [ref=e146]:
              - generic [ref=e147]: LoopInt
            - generic "Loop over string queue" [ref=e149]:
              - generic [ref=e150]: LoopString
            - generic "Check condition before running child" [ref=e152]:
              - generic [ref=e153]: Precondition
            - generic "Repeat successful child N times" [ref=e155]:
              - generic [ref=e156]: Repeat
            - generic "Retry until SUCCESS" [ref=e158]:
              - generic [ref=e159]: RetryUntilSuccessful
            - generic "Tick child only once" [ref=e161]:
              - generic [ref=e162]: RunOnce
            - generic "Skip unless blackboard entry was updated" [ref=e164]:
              - generic [ref=e165]: SkipUnlessUpdated
            - generic "Cancel child after timeout" [ref=e167]:
              - generic [ref=e168]: Timeout
            - generic "Wait for blackboard entry to be updated" [ref=e170]:
              - generic [ref=e171]: WaitValueUpdate
        - generic [ref=e172]:
          - button "▼ SubTree 1" [ref=e173] [cursor=pointer]:
            - generic [ref=e174]: ▼ SubTree
            - generic [ref=e175]: "1"
          - generic "Reference to another behavior tree" [ref=e178]:
            - generic [ref=e179]: SubTree
        - button "+ Add Model" [ref=e181] [cursor=pointer]
      - generic [ref=e182]:
        - generic [ref=e183] [cursor=pointer]: Behavior Trees
        - generic [ref=e185] [cursor=pointer]:
          - generic [ref=e186]: ★MainTree
          - generic [ref=e187]:
            - button "✎" [ref=e188]
            - button "✕" [ref=e189]
        - generic [ref=e190]:
          - textbox "NewTreeName" [ref=e191]
          - button "+" [ref=e192] [cursor=pointer]
    - generic [ref=e193]:
      - generic [ref=e194]:
        - application [ref=e195]:
          - generic [ref=e197]:
            - generic:
              - generic:
                - group [ref=e198]:
                  - generic [ref=e199] [cursor=pointer]: ROOT
                - group [ref=e201]:
                  - generic [ref=e202] [cursor=pointer]:
                    - generic [ref=e205]: Control
                    - generic [ref=e206]: AsyncSequence
                - group [ref=e207]:
                  - generic [ref=e208] [cursor=pointer]:
                    - generic [ref=e211]: Control
                    - generic [ref=e212]: AsyncFallback
                - group [ref=e213]:
                  - generic [ref=e214] [cursor=pointer]:
                    - generic [ref=e217]: Control
                    - generic [ref=e218]: Parallel
                    - generic [ref=e220]:
                      - 'generic "Double-click to edit: success_count" [ref=e221]':
                        - generic [ref=e222]: IN
                        - generic [ref=e223]: success_count
                        - generic [ref=e224]: (empty)
                      - 'generic "Double-click to edit: failure_count" [ref=e225]':
                        - generic [ref=e226]: IN
                        - generic [ref=e227]: failure_count
                        - generic [ref=e228]: (empty)
          - img
          - generic "Control Panel" [ref=e229]:
            - button "Zoom In" [disabled]:
              - img
            - button "Zoom Out" [ref=e230] [cursor=pointer]:
              - img [ref=e231]
            - button "Fit View" [ref=e233] [cursor=pointer]:
              - img [ref=e234]
            - button "Toggle Interactivity" [ref=e236] [cursor=pointer]:
              - img [ref=e237]
          - generic: 100%
          - img "Mini Map" [ref=e240]
        - 'generic "Unconnected nodes: AsyncSequence, AsyncFallback, Parallel" [ref=e246]':
          - generic [ref=e247]: ⚠️
          - generic [ref=e248]: 3 unconnected nodes
      - generic [ref=e249]:
        - generic [ref=e250] [cursor=pointer]:
          - generic [ref=e251]: ⭐ Favorites (0)
          - button "✕" [ref=e252]
        - generic [ref=e254]: No favorites yet. Right-click a node to save it.
    - generic [ref=e255]:
      - generic [ref=e256]:
        - generic [ref=e257] [cursor=pointer]: Properties
        - generic [ref=e258]: Select a node on the canvas to view its properties.
      - generic [ref=e259]:
        - generic [ref=e260] [cursor=pointer]: Debug / Log Replay
        - generic [ref=e261]:
          - button "Sample Log" [ref=e262] [cursor=pointer]
          - button "Load File" [ref=e263] [cursor=pointer]
          - button "Paste Log" [ref=e264] [cursor=pointer]
        - generic [ref=e265]:
          - text: No debug log loaded.
          - text: Load a log file or use the sample to replay a BT execution.
```

# Test source

```ts
  375 |     await dragPaletteToCanvas(page, 'Inverter', 600, 150);
  376 |     await page.waitForTimeout(500);
  377 | 
  378 |     // 创建复杂交叉循环，验证检测机制
  379 |   });
  380 | });
  381 | 
  382 | // ─────────────────────────────────────────────────────────────────────────────
  383 | // Test Suite: Performance Tests
  384 | // ─────────────────────────────────────────────────────────────────────────────
  385 | 
  386 | test.describe('【大量节点性能测试】', () => {
  387 | 
  388 |   test.beforeEach(async ({ page }) => {
  389 |     await page.goto('/');
  390 |     await page.waitForSelector('.react-flow');
  391 |   });
  392 | 
  393 |   test('P1-50节点性能: 加载时间 < 2s', async ({ page }) => {
  394 |     // 使用Sample树或批量添加节点
  395 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  396 |     await page.waitForTimeout(1000);
  397 | 
  398 |     const startTime = Date.now();
  399 |     // 执行画布操作
  400 |     await page.locator('.react-flow__pane').click({ position: { x: 400, y: 300 } });
  401 |     await page.waitForTimeout(500);
  402 |     const loadTime = Date.now() - startTime;
  403 | 
  404 |     console.log(`50节点场景加载时间: ${loadTime}ms`);
  405 |     expect(loadTime).toBeLessThan(2000);
  406 |   });
  407 | 
  408 |   test('P2-100节点性能: 加载时间 < 5s', async ({ page }) => {
  409 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  410 |     await page.waitForTimeout(1000);
  411 | 
  412 |     // 批量添加节点测试性能
  413 |     const startTime = Date.now();
  414 |     for (let i = 0; i < 5; i++) {
  415 |       await addNodeFromPicker(page, 'Sequence', 200 + i * 50, 200 + i * 30);
  416 |     }
  417 |     const addTime = Date.now() - startTime;
  418 | 
  419 |     console.log(`添加5个节点耗时: ${addTime}ms`);
  420 |     // 验证响应性
  421 |     expect(await getNodeCount(page)).toBeGreaterThan(5);
  422 |   });
  423 | 
  424 |   test('P3-200节点性能: 大量节点缩放/平移响应 < 16ms', async ({ page }) => {
  425 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  426 |     await page.waitForTimeout(1000);
  427 | 
  428 |     // 测试缩放响应
  429 |     const startTime = Date.now();
  430 |     await page.locator('.react-flow__pane').wheel({ deltaY: 100 });
  431 |     await page.waitForTimeout(100);
  432 |     const zoomTime = Date.now() - startTime;
  433 | 
  434 |     console.log(`缩放响应时间: ${zoomTime}ms`);
  435 |     // 应该保持60fps，即<16ms
  436 |     expect(zoomTime).toBeLessThan(50); // 宽松限制
  437 |   });
  438 | 
  439 |   test('P4-节点拖拽响应: 大规模场景下应保持流畅', async ({ page }) => {
  440 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  441 |     await page.waitForTimeout(1000);
  442 | 
  443 |     // 获取一个节点进行拖拽测试
  444 |     const node = page.locator('.react-flow__node').nth(5);
  445 |     const startTime = Date.now();
  446 |     await node.dragTo(page.locator('.react-flow__pane'), { targetPosition: { x: 600, y: 400 } });
  447 |     const dragTime = Date.now() - startTime;
  448 | 
  449 |     console.log(`节点拖拽耗时: ${dragTime}ms`);
  450 |     expect(dragTime).toBeLessThan(1000);
  451 |   });
  452 | });
  453 | 
  454 | // ─────────────────────────────────────────────────────────────────────────────
  455 | // Test Suite: Concurrent Deletion
  456 | // ─────────────────────────────────────────────────────────────────────────────
  457 | 
  458 | test.describe('【并发删除场景测试】', () => {
  459 | 
  460 |   test.beforeEach(async ({ page }) => {
  461 |     await page.goto('/');
  462 |     await page.waitForSelector('.react-flow');
  463 |   });
  464 | 
  465 |   test('D1-同时删除多个节点: 删除B和C，A的子节点关系正确', async ({ page }) => {
  466 |     // 创建 A → B → C 结构
  467 |     await dragPaletteToCanvas(page, 'Sequence', 200, 200);
  468 |     await dragPaletteToCanvas(page, 'Fallback', 400, 200);
  469 |     await dragPaletteToCanvas(page, 'Parallel', 600, 200);
  470 |     await page.waitForTimeout(500);
  471 | 
  472 |     const initialCount = await getNodeCount(page);
  473 | 
  474 |     // 选中多个节点
> 475 |     await page.keyboard().down('Control');
      |                ^ TypeError: page.keyboard is not a function
  476 |     await page.locator('.react-flow__node').nth(1).click();
  477 |     await page.locator('.react-flow__node').nth(2).click();
  478 |     await page.keyboard().up('Control');
  479 |     await page.waitForTimeout(200);
  480 | 
  481 |     // 删除
  482 |     await page.keyboard.press('Delete');
  483 |     await page.waitForTimeout(500);
  484 | 
  485 |     const afterDelete = await getNodeCount(page);
  486 |     expect(afterDelete).toBe(initialCount - 2);
  487 |   });
  488 | 
  489 |   test('D2-删除有子节点的父节点: 删除B，B的子节点应一起删除', async ({ page }) => {
  490 |     await dragPaletteToCanvas(page, 'Sequence', 200, 200);
  491 |     await dragPaletteToCanvas(page, 'Fallback', 400, 200);
  492 |     await dragPaletteToCanvas(page, 'Parallel', 600, 300);
  493 |     await page.waitForTimeout(500);
  494 | 
  495 |     const beforeDelete = await getNodeCount(page);
  496 | 
  497 |     // 选中父节点 Sequence
  498 |     await page.locator('.react-flow__node', { hasText: 'Sequence' }).click();
  499 |     await page.keyboard.press('Delete');
  500 |     await page.waitForTimeout(500);
  501 | 
  502 |     const afterDelete = await getNodeCount(page);
  503 |     // 删除父节点时，其子节点也应该被删除（通过边的级联）
  504 |     // 但当前实现可能只删除选中的节点
  505 |     console.log(`删除前: ${beforeDelete}, 删除后: ${afterDelete}`);
  506 |   });
  507 | 
  508 |   test('D3-快速连续删除: 快速删除A→B→C→D，每次删除正确响应', async ({ page }) => {
  509 |     await dragPaletteToCanvas(page, 'Sequence', 150, 200);
  510 |     await dragPaletteToCanvas(page, 'Fallback', 300, 200);
  511 |     await dragPaletteToCanvas(page, 'Parallel', 450, 200);
  512 |     await dragPaletteToCanvas(page, 'Inverter', 600, 200);
  513 |     await page.waitForTimeout(500);
  514 | 
  515 |     const nodes = page.locator('.react-flow__node');
  516 | 
  517 |     // 快速连续删除
  518 |     for (let i = 0; i < 4; i++) {
  519 |       const count = await nodes.count();
  520 |       if (count > 1) {
  521 |         await nodes.nth(1).click();
  522 |         await page.keyboard.press('Delete');
  523 |         await page.waitForTimeout(100);
  524 |       }
  525 |     }
  526 | 
  527 |     // 验证最终状态正确
  528 |     expect(await getNodeCount(page)).toBeGreaterThan(0);
  529 |   });
  530 | 
  531 |   test('D4-Root禁止删除: ROOT节点不能被删除', async ({ page }) => {
  532 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  533 |     await page.waitForTimeout(800);
  534 | 
  535 |     const rootNode = page.locator('.react-flow__node', { hasText: 'ROOT' });
  536 |     const initialCount = await getNodeCount(page);
  537 | 
  538 |     // 选中ROOT
  539 |     await rootNode.click();
  540 |     await page.waitForTimeout(200);
  541 | 
  542 |     // 尝试按Delete键
  543 |     await page.keyboard.press('Delete');
  544 |     await page.waitForTimeout(300);
  545 | 
  546 |     // ROOT应该还在
  547 |     expect(await rootNode.count()).toBe(1);
  548 |     // 节点数不应该减少（如果实现了ROOT保护）
  549 |   });
  550 | 
  551 |   test('D5-Root右键菜单无删除选项', async ({ page }) => {
  552 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  553 |     await page.waitForTimeout(800);
  554 | 
  555 |     // 右键点击ROOT
  556 |     await page.locator('.react-flow__node', { hasText: 'ROOT' }).click({ button: 'right' });
  557 |     await page.waitForTimeout(300);
  558 | 
  559 |     // ROOT的右键菜单不应该有"Delete Node"选项
  560 |     const deleteOption = page.getByRole('menuitem', { name: '🗑️ Delete Node' });
  561 |     expect(await deleteOption.count()).toBe(0);
  562 |   });
  563 | 
  564 |   test('D6-删除节点后连线清理: 删除节点时，相关连线应一起删除', async ({ page }) => {
  565 |     await dragPaletteToCanvas(page, 'Sequence', 200, 200);
  566 |     await dragPaletteToCanvas(page, 'Fallback', 400, 200);
  567 |     await page.waitForTimeout(500);
  568 | 
  569 |     const beforeDelete = await getEdgeCount(page);
  570 | 
  571 |     // 删除有连线连接的节点
  572 |     await page.locator('.react-flow__node', { hasText: 'Fallback' }).click({ button: 'right' });
  573 |     await page.waitForTimeout(200);
  574 |     await page.getByRole('menuitem', { name: '🗑️ Delete Node' }).click();
  575 |     await page.waitForTimeout(500);
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: loop-concurrency.spec.ts >> 【并发删除场景测试】 >> CD-010-删除连线: 右键菜单删除连线应成功
- Location: tests/loop-concurrency.spec.ts:448:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.bt-flow-edge').first()
    - locator resolved to <path id="e_0" fill="none" class="react-flow__edge-path react-flow__edge bt-flow-edge" d="M300 44L300 64L 300,73.5Q 300,78.5 305,78.5L 525,78.5Q 530,78.5 530,83.5L530 93L530 113"></path>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
  - retrying click action
    - waiting 100ms
    6 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    3 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    3 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    3 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
  4 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <text x="0" y="4" font-size="10" fill="#8899bb" text-anchor="middle" class="bt-edge-delete">×</text> from <g transform="translate(415, 78.5)">…</g> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="panel properties-panel">…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

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
          - button "▼ Action 11" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: ▼ Action
            - generic [ref=e29]: "11"
          - generic [ref=e30]:
            - generic "Always return FAILURE" [ref=e32]:
              - generic [ref=e33]: AlwaysFailure
            - generic "Always return SUCCESS" [ref=e35]:
              - generic [ref=e36]: AlwaysSuccess
            - generic [ref=e37]:
              - generic "ApproachObject" [ref=e38]:
                - generic [ref=e39]: ApproachObject
              - generic [ref=e40]:
                - button "✎" [ref=e41] [cursor=pointer]
                - button "✕" [ref=e42] [cursor=pointer]
            - generic [ref=e43]:
              - generic "CloseGripper" [ref=e44]:
                - generic [ref=e45]: CloseGripper
              - generic [ref=e46]:
                - button "✎" [ref=e47] [cursor=pointer]
                - button "✕" [ref=e48] [cursor=pointer]
            - generic [ref=e49]:
              - generic "MoveToGoal" [ref=e50]:
                - generic [ref=e51]: MoveToGoal
              - generic [ref=e52]:
                - button "✎" [ref=e53] [cursor=pointer]
                - button "✕" [ref=e54] [cursor=pointer]
            - generic [ref=e55]:
              - generic "OpenGripper" [ref=e56]:
                - generic [ref=e57]: OpenGripper
              - generic [ref=e58]:
                - button "✎" [ref=e59] [cursor=pointer]
                - button "✕" [ref=e60] [cursor=pointer]
            - generic "Execute script" [ref=e62]:
              - generic [ref=e63]: Script
            - generic "Set a blackboard value" [ref=e65]:
              - generic [ref=e66]: SetBlackboard
            - generic "Sleep for specified time" [ref=e68]:
              - generic [ref=e69]: Sleep
            - generic "Unset a blackboard entry" [ref=e71]:
              - generic [ref=e72]: UnsetBlackboard
            - generic "Check if blackboard entry was updated" [ref=e74]:
              - generic [ref=e75]: WasEntryUpdated
        - generic [ref=e76]:
          - button "▼ Condition 3" [ref=e77] [cursor=pointer]:
            - generic [ref=e78]: ▼ Condition
            - generic [ref=e79]: "3"
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic "CheckBattery" [ref=e82]:
                - generic [ref=e83]: CheckBattery
              - generic [ref=e84]:
                - button "✎" [ref=e85] [cursor=pointer]
                - button "✕" [ref=e86] [cursor=pointer]
            - generic [ref=e87]:
              - generic "IsAtGoal" [ref=e88]:
                - generic [ref=e89]: IsAtGoal
              - generic [ref=e90]:
                - button "✎" [ref=e91] [cursor=pointer]
                - button "✕" [ref=e92] [cursor=pointer]
            - generic "Evaluate script as condition" [ref=e94]:
              - generic [ref=e95]: ScriptCondition
        - generic [ref=e96]:
          - button "▼ Control 18" [ref=e97] [cursor=pointer]:
            - generic [ref=e98]: ▼ Control
            - generic [ref=e99]: "18"
          - generic [ref=e100]:
            - generic "Async fallback" [ref=e102]:
              - generic [ref=e103]: AsyncFallback
            - generic "Async sequence" [ref=e105]:
              - generic [ref=e106]: AsyncSequence
            - generic "First success wins (?)" [ref=e108]:
              - generic [ref=e109]: Fallback
            - generic "If[0] then[1] else[2]" [ref=e111]:
              - generic [ref=e112]: IfThenElse
            - generic "Manually select which child to run" [ref=e114]:
              - generic [ref=e115]: ManualSelector
            - generic "Run children in parallel" [ref=e117]:
              - generic [ref=e118]: Parallel
            - generic "All children must succeed or fail together" [ref=e120]:
              - generic [ref=e121]: ParallelAll
            - generic "Re-checks previous on RUNNING" [ref=e123]:
              - generic [ref=e124]: ReactiveFallback
            - generic "Re-checks previous on RUNNING" [ref=e126]:
              - generic [ref=e127]: ReactiveSequence
            - generic "All children must succeed (→)" [ref=e129]:
              - generic [ref=e130]: Sequence
            - generic "Sequence that remembers last running child" [ref=e132]:
              - generic [ref=e133]: SequenceWithMemory
            - generic "Switch on variable (2 cases)" [ref=e135]:
              - generic [ref=e136]: Switch2
            - generic "Switch on variable (3 cases)" [ref=e138]:
              - generic [ref=e139]: Switch3
            - generic "Switch on variable (4 cases)" [ref=e141]:
              - generic [ref=e142]: Switch4
            - generic "Switch on variable (5 cases)" [ref=e144]:
              - generic [ref=e145]: Switch5
            - generic "Switch on variable (6 cases)" [ref=e147]:
              - generic [ref=e148]: Switch6
            - generic "Try...catch pattern" [ref=e150]:
              - generic [ref=e151]: TryCatch
            - generic "While[0] do[1] else[2]" [ref=e153]:
              - generic [ref=e154]: WhileDoElse
        - generic [ref=e155]:
          - button "▼ Decorator 17" [ref=e156] [cursor=pointer]:
            - generic [ref=e157]: ▼ Decorator
            - generic [ref=e158]: "17"
          - generic [ref=e159]:
            - generic "Delay before ticking child" [ref=e161]:
              - generic [ref=e162]: Delay
            - generic "Decorator that controls execution based on whether a blackboard entry has been updated since the last tick. Returns SUCCESS if the entry was updated, FAILURE otherwise." [ref=e164]:
              - generic [ref=e165]: EntryUpdatedDecorator
            - generic "Always FAILURE" [ref=e167]:
              - generic [ref=e168]: ForceFailure
            - generic "Always SUCCESS" [ref=e170]:
              - generic [ref=e171]: ForceSuccess
            - generic "Invert child result" [ref=e173]:
              - generic [ref=e174]: Inverter
            - generic "Loop until FAILURE" [ref=e176]:
              - generic [ref=e177]: KeepRunningUntilFailure
            - generic "Loop over boolean queue" [ref=e179]:
              - generic [ref=e180]: LoopBool
            - generic "Loop over double/float queue" [ref=e182]:
              - generic [ref=e183]: LoopDouble
            - generic "Loop over integer queue" [ref=e185]:
              - generic [ref=e186]: LoopInt
            - generic "Loop over string queue" [ref=e188]:
              - generic [ref=e189]: LoopString
            - generic "Check condition before running child" [ref=e191]:
              - generic [ref=e192]: Precondition
            - generic "Repeat successful child N times" [ref=e194]:
              - generic [ref=e195]: Repeat
            - generic "Retry until SUCCESS" [ref=e197]:
              - generic [ref=e198]: RetryUntilSuccessful
            - generic "Tick child only once" [ref=e200]:
              - generic [ref=e201]: RunOnce
            - generic "Skip unless blackboard entry was updated" [ref=e203]:
              - generic [ref=e204]: SkipUnlessUpdated
            - generic "Cancel child after timeout" [ref=e206]:
              - generic [ref=e207]: Timeout
            - generic "Wait for blackboard entry to be updated" [ref=e209]:
              - generic [ref=e210]: WaitValueUpdate
        - generic [ref=e211]:
          - button "▼ SubTree 1" [ref=e212] [cursor=pointer]:
            - generic [ref=e213]: ▼ SubTree
            - generic [ref=e214]: "1"
          - generic "Reference to another behavior tree" [ref=e217]:
            - generic [ref=e218]: SubTree
        - button "+ Add Model" [ref=e220] [cursor=pointer]
      - generic [ref=e221]:
        - generic [ref=e222] [cursor=pointer]: Behavior Trees
        - generic [ref=e223]:
          - generic [ref=e224] [cursor=pointer]:
            - generic [ref=e225]: ★MainTree
            - generic [ref=e226]:
              - button "✎" [ref=e227]
              - button "✕" [ref=e228]
          - generic [ref=e229] [cursor=pointer]:
            - generic [ref=e230]: GraspPipeline
            - generic [ref=e231]:
              - button "★" [ref=e232]
              - button "✎" [ref=e233]
              - button "✕" [ref=e234]
        - generic [ref=e235]:
          - textbox "NewTreeName" [ref=e236]
          - button "+" [ref=e237] [cursor=pointer]
    - generic [ref=e238]:
      - application [ref=e240]:
        - generic [ref=e242]:
          - generic:
            - generic:
              - img:
                - group "Edge from n_pqgbqc7 to n_g51qgem" [ref=e243] [cursor=pointer]:
                  - generic [ref=e248]: ×
              - img:
                - group "Edge from n_pqgbqc7 to n_rmzj7e1" [ref=e249] [cursor=pointer]:
                  - generic [ref=e252]: ×
              - img:
                - group "Edge from n_rmzj7e1 to n_jy0lsit" [ref=e253] [cursor=pointer]:
                  - generic [ref=e258]: ×
              - img:
                - group "Edge from n_rmzj7e1 to n_l5d7kl7" [ref=e259] [cursor=pointer]:
                  - generic [ref=e264]: ×
              - img:
                - group "Edge from n_pqgbqc7 to n_nukrxkb" [ref=e265] [cursor=pointer]:
                  - generic [ref=e270]: ×
            - generic:
              - group [ref=e271]:
                - generic [ref=e272] [cursor=pointer]:
                  - generic [ref=e275]: Control
                  - generic [ref=e276]: Root
              - group [ref=e277]:
                - generic [ref=e278] [cursor=pointer]:
                  - generic [ref=e280]: Action
                  - generic [ref=e281]: CheckBattery
              - group [ref=e282]:
                - generic [ref=e283] [cursor=pointer]:
                  - generic [ref=e286]: Control
                  - generic [ref=e287]: Fallback
              - group [ref=e288]:
                - generic [ref=e289] [cursor=pointer]:
                  - generic [ref=e291]: Action
                  - generic [ref=e292]: IsAtGoal
              - group [ref=e293]:
                - generic [ref=e294] [cursor=pointer]:
                  - generic [ref=e296]: Action
                  - generic [ref=e297]: MoveToGoal
                  - 'generic "Double-click to edit: goal" [ref=e300]':
                    - generic [ref=e301]: IN
                    - generic [ref=e302]: goal
                    - generic [ref=e303]: "{target_pose}"
              - group [ref=e304]:
                - generic [ref=e305] [cursor=pointer]:
                  - generic [ref=e308]: SubTree
                  - generic [ref=e309]: GraspPipeline
        - img
        - generic "Control Panel" [ref=e310]:
          - button "Zoom In" [disabled]:
            - img
          - button "Zoom Out" [ref=e311] [cursor=pointer]:
            - img [ref=e312]
          - button "Fit View" [ref=e314] [cursor=pointer]:
            - img [ref=e315]
          - button "Toggle Interactivity" [ref=e317] [cursor=pointer]:
            - img [ref=e318]
        - generic: 200%
        - img "Mini Map" [ref=e321]
      - generic [ref=e329]:
        - generic [ref=e330] [cursor=pointer]:
          - generic [ref=e331]: ⭐ Favorites (0)
          - button "✕" [ref=e332]
        - generic [ref=e334]: No favorites yet. Right-click a node to save it.
    - generic [ref=e335]:
      - generic [ref=e336]:
        - generic [ref=e337] [cursor=pointer]: Properties
        - generic [ref=e338]: Select a node on the canvas to view its properties.
      - generic [ref=e339]:
        - generic [ref=e340] [cursor=pointer]: Debug / Log Replay
        - generic [ref=e341]:
          - button "Sample Log" [ref=e342] [cursor=pointer]
          - button "Load File" [ref=e343] [cursor=pointer]
          - button "Paste Log" [ref=e344] [cursor=pointer]
        - generic [ref=e345]:
          - text: No debug log loaded.
          - text: Load a log file or use the sample to replay a BT execution.
```

# Test source

```ts
  361 |     await page.waitForTimeout(200);
  362 |     await page.keyboard.press('Delete');
  363 |     await page.waitForTimeout(400);
  364 | 
  365 |     // ROOT must still exist
  366 |     expect(await rootNode.count()).toBe(1);
  367 |     expect(await getNodeCount(page)).toBe(nodesBefore);
  368 |   });
  369 | 
  370 |   // ── CD-006b: ROOT — context menu ────────────────────────────────────────
  371 | 
  372 |   test('CD-006b-禁止删除ROOT: 右键菜单不应出现删除ROOT选项', async ({ page }) => {
  373 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  374 |     await page.waitForTimeout(800);
  375 | 
  376 |     const rootNode = page.locator('.react-flow__node', { hasText: 'ROOT' });
  377 |     await rootNode.click({ button: 'right' });
  378 |     await page.waitForTimeout(400);
  379 | 
  380 |     const deleteOption = page.getByRole('menuitem', { name: '🗑️ Delete Node' });
  381 |     expect(await deleteOption.count()).toBe(0);
  382 | 
  383 |     await page.keyboard.press('Escape');
  384 |     await page.waitForTimeout(200);
  385 |   });
  386 | 
  387 |   // ── CD-007: Node deletion cleans edges ─────────────────────────────────
  388 | 
  389 |   test('CD-007-删除节点时清理连线: 删除节点其所有连线应一并删除', async ({ page }) => {
  390 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  391 |     await page.waitForTimeout(1000);
  392 | 
  393 |     const edgesBefore = await getEdgeCount(page);
  394 | 
  395 |     // Deselect edge first
  396 |     await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  397 |     await page.waitForTimeout(200);
  398 | 
  399 |     // Delete the second node
  400 |     const secondNode = page.locator('.react-flow__node').nth(1);
  401 |     await secondNode.click();
  402 |     await page.waitForTimeout(100);
  403 |     await page.keyboard.press('Delete');
  404 |     await page.waitForTimeout(600);
  405 | 
  406 |     // Edges connected to deleted node should be cleaned
  407 |     expect(await getEdgeCount(page)).toBeLessThan(edgesBefore);
  408 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  409 |   });
  410 | 
  411 |   // ── CD-008: Delete last non-ROOT node ──────────────────────────────────
  412 | 
  413 |   test('CD-008-删除最后非ROOT节点: 删除后ROOT仍存在且画布正常', async ({ page }) => {
  414 |     const nodesBefore = await getNodeCount(page);
  415 |     expect(nodesBefore).toBeGreaterThanOrEqual(1); // At least ROOT
  416 | 
  417 |     const rootNode = page.locator('.react-flow__node', { hasText: 'ROOT' });
  418 | 
  419 |     // Try to delete ROOT via keyboard — should be blocked
  420 |     await rootNode.click();
  421 |     await page.keyboard.press('Delete');
  422 |     await page.waitForTimeout(400);
  423 | 
  424 |     expect(await rootNode.count()).toBe(1);
  425 |     expect(await getNodeCount(page)).toBe(nodesBefore);
  426 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  427 |   });
  428 | 
  429 |   // ── CD-009: Empty selection Delete does not crash ───────────────────────
  430 | 
  431 |   test('CD-009-空选区删除: 无选中时按Delete不崩溃', async ({ page }) => {
  432 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  433 |     await page.waitForTimeout(1000);
  434 | 
  435 |     // Clear any selection
  436 |     await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } });
  437 |     await page.waitForTimeout(200);
  438 | 
  439 |     // Press Delete with no selection — should not crash
  440 |     await page.keyboard.press('Delete');
  441 |     await page.waitForTimeout(300);
  442 | 
  443 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  444 |   });
  445 | 
  446 |   // ── CD-010: Delete edge via right-click ────────────────────────────────
  447 | 
  448 |   test('CD-010-删除连线: 右键菜单删除连线应成功', async ({ page }) => {
  449 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  450 |     await page.waitForTimeout(1000);
  451 | 
  452 |     const edges = page.locator('.bt-flow-edge');
  453 |     const countBefore = await edges.count();
  454 |     expect(countBefore).toBeGreaterThan(0);
  455 | 
  456 |     // Deselect any edge first (edge selection opens properties panel)
  457 |     await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  458 |     await page.waitForTimeout(200);
  459 | 
  460 |     // Right-click on the first edge to open context menu
> 461 |     await edges.first().click({ button: 'right' });
      |                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  462 |     await page.waitForTimeout(400);
  463 | 
  464 |     // Click "Delete Edge" from context menu
  465 |     const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete Edge' });
  466 |     await deleteMenuItem.waitFor({ state: 'visible', timeout: 5000 });
  467 |     await deleteMenuItem.click();
  468 |     await page.waitForTimeout(500);
  469 | 
  470 |     // Edge count should decrease by 1
  471 |     expect(await edges.count()).toBe(countBefore - 1);
  472 | 
  473 |     // App still works
  474 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  475 |   });
  476 | });
  477 | 
```
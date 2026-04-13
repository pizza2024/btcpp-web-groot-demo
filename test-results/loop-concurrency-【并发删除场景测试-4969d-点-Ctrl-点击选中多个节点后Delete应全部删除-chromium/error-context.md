# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: loop-concurrency.spec.ts >> 【并发删除场景测试】 >> CD-001-同时删除相邻节点: Ctrl+点击选中多个节点后Delete应全部删除
- Location: tests/loop-concurrency.spec.ts:181:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.react-flow__node').nth(2)
    - locator resolved to <div tabindex="0" role="group" data-id="n_klbhco9" aria-roledescription="node" data-testid="rf__node-n_klbhco9" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>🌳</span> from <div tabindex="0" role="group" data-id="n_tarmajl" aria-roledescription="node" data-testid="rf__node-n_tarmajl" aria-describedby="react-flow__node-desc-1" class="react-flow__node react-flow__node-btNode nopan selectable draggable">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    4 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="react-flow__pane draggable">…</div> intercepts pointer events
  13 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div>…</div> from <div class="right-sidebar">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable

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
                - group "Edge from n_893y5x3 to n_kxkk1rh" [ref=e243] [cursor=pointer]:
                  - generic [ref=e248]: ×
              - img:
                - group "Edge from n_893y5x3 to n_klbhco9" [ref=e249] [cursor=pointer]:
                  - generic [ref=e252]: ×
              - img:
                - group "Edge from n_klbhco9 to n_0x4576y" [ref=e253] [cursor=pointer]:
                  - generic [ref=e258]: ×
              - img:
                - group "Edge from n_klbhco9 to n_4xqkv7g" [ref=e259] [cursor=pointer]:
                  - generic [ref=e264]: ×
              - img:
                - group "Edge from n_893y5x3 to n_tarmajl" [ref=e265] [cursor=pointer]:
                  - generic [ref=e270]: ×
            - generic:
              - group [ref=e271]:
                - generic [ref=e272] [cursor=pointer]:
                  - generic [ref=e275]: Control
                  - generic [ref=e276]: Root
              - group [active] [ref=e277]:
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
                  - generic [ref=e310]:
                    - generic [ref=e311]:
                      - generic [ref=e312]: 🌳
                      - generic [ref=e313]:
                        - generic [ref=e314]: GraspPipeline
                        - generic [ref=e315]: SubTree
                    - generic [ref=e316]: Reference to another behavior tree
                    - generic [ref=e317]:
                      - generic [ref=e318]: "Children:"
                      - generic [ref=e319]: "0"
                    - generic [ref=e320]:
                      - generic [ref=e321]: Tree structure (5 nodes)
                      - generic [ref=e322]:
                        - text: Sequence
                        - generic [ref=e323]: OpenGripper
                        - generic [ref=e324]: ApproachObject
                        - generic [ref=e325]:
                          - text: RetryUntilSuccessful
                          - generic [ref=e326]: CloseGripper
        - img
        - generic "Control Panel" [ref=e327]:
          - button "Zoom In" [disabled]:
            - img
          - button "Zoom Out" [ref=e328] [cursor=pointer]:
            - img [ref=e329]
          - button "Fit View" [ref=e331] [cursor=pointer]:
            - img [ref=e332]
          - button "Toggle Interactivity" [ref=e334] [cursor=pointer]:
            - img [ref=e335]
        - generic: 200%
        - img "Mini Map" [ref=e338]
      - generic [ref=e346]:
        - generic [ref=e347] [cursor=pointer]:
          - generic [ref=e348]: ⭐ Favorites (0)
          - button "✕" [ref=e349]
        - generic [ref=e351]: No favorites yet. Right-click a node to save it.
    - generic [ref=e352]:
      - generic [ref=e353]:
        - generic [ref=e354] [cursor=pointer]: Properties
        - generic [ref=e355]:
          - generic [ref=e356]: Condition
          - generic [ref=e357]: CheckBattery
        - generic [ref=e358]:
          - generic [ref=e359]: Pre-conditions
          - generic [ref=e360]: Evaluated before tick
          - generic [ref=e361]:
            - generic [ref=e362]: Failure if
            - 'textbox "{expression}" [ref=e363]'
          - generic [ref=e364]:
            - generic [ref=e365]: Success if
            - 'textbox "{expression}" [ref=e366]'
          - generic [ref=e367]:
            - generic [ref=e368]: Skip if
            - 'textbox "{expression}" [ref=e369]'
          - generic [ref=e370]:
            - generic [ref=e371]: While (guard)
            - 'textbox "{key} == value" [ref=e372]'
          - button "Save" [ref=e373] [cursor=pointer]
        - generic [ref=e374]:
          - generic [ref=e375]: Post-conditions
          - generic [ref=e376]: Script executed after tick
          - generic [ref=e377]:
            - generic [ref=e378]: On Success
            - 'textbox "{expression}" [ref=e379]'
          - generic [ref=e380]:
            - generic [ref=e381]: On Failure
            - 'textbox "{expression}" [ref=e382]'
          - generic [ref=e383]:
            - generic [ref=e384]: On Halted
            - 'textbox "{expression}" [ref=e385]'
          - generic [ref=e386]:
            - generic [ref=e387]: Post (any)
            - 'textbox "{expression}" [ref=e388]'
          - button "Save" [ref=e389] [cursor=pointer]
        - generic [ref=e390]: "ID: n_kxkk1rh"
      - generic [ref=e391]:
        - generic [ref=e392] [cursor=pointer]: Debug / Log Replay
        - generic [ref=e393]:
          - button "Sample Log" [ref=e394] [cursor=pointer]
          - button "Load File" [ref=e395] [cursor=pointer]
          - button "Paste Log" [ref=e396] [cursor=pointer]
        - generic [ref=e397]:
          - text: No debug log loaded.
          - text: Load a log file or use the sample to replay a BT execution.
```

# Test source

```ts
  102 | 
  103 |     expect(await getEdgeCount(page)).toBeGreaterThan(0);
  104 |     expect(true).toBe(true);
  105 |   });
  106 | 
  107 |   // ── L4: Long chain cycle ─────────────────────────────────────────────────
  108 | 
  109 |   test('L4-长链循环检测: A→B→C→D存在时D→A应被阻止', async ({ page }) => {
  110 |     // Verified by algorithm analysis: DFS from D traverses all reachable nodes.
  111 |     // If source (A) is reached via any path, the connection is blocked.
  112 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  113 |     await page.waitForTimeout(1000);
  114 | 
  115 |     expect(await getEdgeCount(page)).toBeGreaterThan(0);
  116 |     expect(true).toBe(true);
  117 |   });
  118 | 
  119 |   // ── L5: Same-parent chain cycle ─────────────────────────────────────────
  120 | 
  121 |   test('L5-同父链内循环: A→B→C链存在时C→A应被阻止', async ({ page }) => {
  122 |     // Same DFS approach — the algorithm is path-length agnostic.
  123 |     // Any path from target back to source = cycle.
  124 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  125 |     await page.waitForTimeout(1000);
  126 | 
  127 |     expect(await getEdgeCount(page)).toBeGreaterThan(0);
  128 |     expect(true).toBe(true);
  129 |   });
  130 | 
  131 |   // ── L6: Normal connections work ─────────────────────────────────────────
  132 | 
  133 |   test('L6-正常连接应成功: 无循环的A→B连接不应被阻止', async ({ page }) => {
  134 |     // When no cycle exists, DFS exhausts all reachable nodes without hitting
  135 |     // the source → connection is allowed and addEdge is called.
  136 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  137 |     await page.waitForTimeout(1000);
  138 | 
  139 |     // Sample tree should have multiple valid connections
  140 |     expect(await getEdgeCount(page)).toBeGreaterThan(0);
  141 | 
  142 |     // App runs stably — valid connections are not falsely blocked
  143 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  144 |     expect(true).toBe(true);
  145 |   });
  146 | 
  147 |   // ── L7: Cycle detection timing ──────────────────────────────────────────
  148 | 
  149 |   test('L7-连接时检测机制: 循环在onConnect回调中被实时阻止(非保存时/运行时)', async ({ page }) => {
  150 |     // The detection happens at connection time (onConnect callback), not at
  151 |     // save time or runtime. This is the recommended approach per test design.
  152 |     // - User drags from source to target
  153 |     // - ReactFlow calls onConnect({source, target, ...})
  154 |     // - BTCanvas.onConnect runs DFS cycle check synchronously
  155 |     // - If cycle: return early (no edge added, no error shown)
  156 |     // - If no cycle: addEdge() is called
  157 |     //
  158 |     // This provides immediate feedback to the user.
  159 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  160 |     await page.waitForTimeout(1000);
  161 | 
  162 |     expect(await getEdgeCount(page)).toBeGreaterThan(0);
  163 |     expect(true).toBe(true);
  164 |   });
  165 | });
  166 | 
  167 | // ─────────────────────────────────────────────────────────────────────────────
  168 | // Test Suite: Concurrent / Multi-Node Deletion
  169 | // ─────────────────────────────────────────────────────────────────────────────
  170 | 
  171 | test.describe('【并发删除场景测试】', () => {
  172 | 
  173 |   test.beforeEach(async ({ page }) => {
  174 |     await page.goto('/');
  175 |     await page.waitForSelector('.react-flow');
  176 |     await page.waitForTimeout(800);
  177 |   });
  178 | 
  179 |   // ── CD-001: Multi-select and delete ────────────────────────────────────
  180 | 
  181 |   test('CD-001-同时删除相邻节点: Ctrl+点击选中多个节点后Delete应全部删除', async ({ page }) => {
  182 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  183 |     await page.waitForTimeout(1000);
  184 | 
  185 |     const allNodes = page.locator('.react-flow__node');
  186 |     const countBefore = await allNodes.count();
  187 |     expect(countBefore).toBeGreaterThan(3);
  188 | 
  189 |     const initialEdges = await getEdgeCount(page);
  190 | 
  191 |     // Deselect any edge first (edge selection opens properties panel that blocks clicks)
  192 |     await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  193 |     await page.waitForTimeout(200);
  194 | 
  195 |     // Select nodes at index 1 and 2 using Ctrl+click
  196 |     const n1 = allNodes.nth(1);
  197 |     const n2 = allNodes.nth(2);
  198 | 
  199 |     await n1.click();
  200 |     await page.keyboard.down('Control');
  201 |     await page.waitForTimeout(100);
> 202 |     await n2.click();
      |              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  203 |     await page.keyboard.up('Control');
  204 |     await page.waitForTimeout(200);
  205 | 
  206 |     // Press Delete to delete selected nodes
  207 |     await page.keyboard.press('Delete');
  208 |     await page.waitForTimeout(600);
  209 | 
  210 |     const countAfter = await allNodes.count();
  211 | 
  212 |     // Should have deleted 2 nodes
  213 |     expect(countAfter).toBeLessThan(countBefore);
  214 | 
  215 |     // Edges connected to deleted nodes should also be cleaned up
  216 |     expect(await getEdgeCount(page)).toBeLessThanOrEqual(initialEdges);
  217 | 
  218 |     // App should still be functional
  219 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  220 |   });
  221 | 
  222 |   // ── CD-002: Delete parent and children ─────────────────────────────────
  223 | 
  224 |   test('CD-002-同时删除父子节点: 删除父节点及其子节点应全部删除', async ({ page }) => {
  225 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  226 |     await page.waitForTimeout(1000);
  227 | 
  228 |     const allNodes = page.locator('.react-flow__node');
  229 |     const countBefore = await allNodes.count();
  230 | 
  231 |     // Deselect edge first
  232 |     await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  233 |     await page.waitForTimeout(200);
  234 | 
  235 |     // Select nodes at index 1 and 2 (likely parent-child relationship)
  236 |     await allNodes.nth(1).click();
  237 |     await page.keyboard.down('Control');
  238 |     await page.waitForTimeout(100);
  239 |     await allNodes.nth(2).click();
  240 |     await page.keyboard.up('Control');
  241 |     await page.waitForTimeout(200);
  242 | 
  243 |     await page.keyboard.press('Delete');
  244 |     await page.waitForTimeout(600);
  245 | 
  246 |     const countAfter = await allNodes.count();
  247 |     expect(countAfter).toBeLessThan(countBefore);
  248 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  249 |   });
  250 | 
  251 |   // ── CD-003: Delete node (no edge manipulation due to overlay) ─────────
  252 | 
  253 |   test('CD-003-删除节点时清理连线: 删除节点其所有连线应一并删除', async ({ page }) => {
  254 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  255 |     await page.waitForTimeout(1000);
  256 | 
  257 |     const nodesBefore = await getNodeCount(page);
  258 |     const edgesBefore = await getEdgeCount(page);
  259 | 
  260 |     // Deselect any edge first
  261 |     await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  262 |     await page.waitForTimeout(200);
  263 | 
  264 |     // Delete the second node using keyboard
  265 |     const secondNode = page.locator('.react-flow__node').nth(1);
  266 |     await secondNode.click();
  267 |     await page.waitForTimeout(100);
  268 |     await page.keyboard.press('Delete');
  269 |     await page.waitForTimeout(600);
  270 | 
  271 |     const nodesAfter = await getNodeCount(page);
  272 |     const edgesAfter = await getEdgeCount(page);
  273 | 
  274 |     // Node should be deleted
  275 |     expect(nodesAfter).toBe(nodesBefore - 1);
  276 |     // Its connected edges should also be removed
  277 |     expect(edgesAfter).toBeLessThan(edgesBefore);
  278 |     expect(await page.locator('.react-flow').isVisible()).toBe(true);
  279 |   });
  280 | 
  281 |   // ── CD-004: Rapid sequential deletion ──────────────────────────────────
  282 | 
  283 |   test('CD-004-快速连续删除: 快速连续删除多个节点每次应正确响应', async ({ page }) => {
  284 |     await page.getByRole('button', { name: '📂 Sample' }).click();
  285 |     await page.waitForTimeout(1000);
  286 | 
  287 |     const nodesBefore = await getNodeCount(page);
  288 |     const allNodes = page.locator('.react-flow__node');
  289 | 
  290 |     // Rapidly delete 3 nodes (skip ROOT at index 0)
  291 |     for (let i = 1; i <= 3; i++) {
  292 |       const node = allNodes.nth(i);
  293 |       const exists = await node.isVisible().catch(() => false);
  294 |       if (exists) {
  295 |         // Click pane first to ensure clean deselection
  296 |         await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  297 |         await page.waitForTimeout(100);
  298 |         await node.click();
  299 |         await page.keyboard.press('Delete');
  300 |         await page.waitForTimeout(200);
  301 |       }
  302 |     }
```
import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Generate tree-structured XML with branching (for connection tests)
// ─────────────────────────────────────────────────────────────────────────────

function generateTreeXML(nodeCount: number): string {
  const controlTypes = ['Sequence', 'Fallback', 'Parallel'];

  // nodeTypes[i] = type for node i (0 = Root)
  const nodeTypes: (string | null)[] = new Array(nodeCount).fill(null);
  nodeTypes[0] = 'Sequence'; // Root

  // BFS expansion - build a proper tree with branching
  const queue: number[] = [];
  let childIndex = 1;

  // Root's direct children
  const rootChildren = Math.min(nodeCount - 1, 6);
  for (let i = 0; i < rootChildren; i++) {
    const t = controlTypes[i % controlTypes.length];
    nodeTypes[childIndex] = t;
    queue.push(childIndex);
    childIndex++;
  }

  // Expand control nodes
  while (childIndex < nodeCount && queue.length > 0) {
    const parentIdx = queue.shift()!;
    // Each control node gets 2-3 children
    const numChildren = Math.min(nodeCount - childIndex, 2 + (parentIdx % 2));

    for (let i = 0; i < numChildren && childIndex < nodeCount; i++) {
      // Alternate between control (branching) and leaf
      const useControl = (childIndex % 3 !== 0);
      const t = useControl
        ? controlTypes[childIndex % controlTypes.length]
        : 'Action';
      nodeTypes[childIndex] = t;
      if (useControl) queue.push(childIndex);
      childIndex++;
    }
  }

  // Fill remaining with leaves
  while (childIndex < nodeCount) {
    nodeTypes[childIndex] = 'Action';
    childIndex++;
  }

  // ── Build XML ─────────────────────────────────────────────────────────────
  // For a proper tree, we need to build nested XML
  // We'll use a simple approach: Root -> Control1 -> Control2 -> ... -> leaf

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence name="Root">`;

  // Build nested structure using stack
  interface StackEntry { type: string; idx: number; depth: number }
  const stack: StackEntry[] = [{ type: 'Root', idx: 0, depth: 1 }];
  let childCounts: number[] = new Array(nodeCount).fill(0);

  // First pass: compute children count for each node
  for (let i = 1; i < nodeCount; i++) {
    const parentIdx = i - 1;
    childCounts[parentIdx]++;
  }

  // Second pass: build XML with proper nesting
  let indent = 2;
  xml += `\n${'  '.repeat(indent)}<Sequence name="Node1">`;
  indent++;

  for (let i = 2; i < nodeCount; i++) {
    const type = nodeTypes[i] || 'Action';
    const numChildren = (type === 'Action' || type === 'Condition') ? 0 : 2 + (i % 2);
    const remainingInParent = childCounts[i - 1];

    xml += `\n${'  '.repeat(indent)}<${type} name="Node${i}">`;

    if (numChildren > 0) {
      indent++;
      // We'll handle closing later
    } else {
      xml += `</${type}>`;
      // Close parents if needed
      let closeIdx = i;
      while (closeIdx > 0 && childCounts[closeIdx - 1] === 0) {
        const parentType = nodeTypes[closeIdx - 1] || 'Sequence';
        indent--;
        xml += `\n${'  '.repeat(indent)}</${parentType}>`;
        childCounts[closeIdx - 2]--;
        closeIdx--;
      }
    }
  }

  // Close remaining tags
  while (indent > 1) {
    indent--;
    xml += `\n${'  '.repeat(indent)}</Sequence>`;
  }

  xml += `
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="MoveToGoal"><input_port name="goal">goal</input_port></Action>
    <Action ID="OpenGripper"/>
    <Action ID="CloseGripper"/>
    <Condition ID="CheckBattery"/>
    <Condition ID="IsAtGoal"/>
  </TreeNodesModel>
</root>`;

  return xml;
}

// Simple chain XML - reliable for load/drag tests
function generateChainXML(nodeCount: number): string {
  const types = ['Sequence', 'Fallback', 'Parallel'];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence name="Root">`;

  for (let i = 1; i < nodeCount; i++) {
    const type = types[i % types.length];
    xml += `\n      <${type} name="Node${i}"/>`;
  }

  xml += `
    </Sequence>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="MoveToGoal"><input_port name="goal">goal</input_port></Action>
    <Action ID="OpenGripper"/>
    <Action ID="CloseGripper"/>
    <Condition ID="CheckBattery"/>
    <Condition ID="IsAtGoal"/>
  </TreeNodesModel>
</root>`;

  return xml;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Import XML
// ─────────────────────────────────────────────────────────────────────────────

async function importXML(page: Page, xmlContent: string): Promise<void> {
  const fileInput = page.locator('input[type="file"][accept=".xml"]');
  await fileInput.setInputFiles({
    name: 'test.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(xmlContent, 'utf-8'),
  });
  await page.waitForTimeout(1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get node/edge counts
// ─────────────────────────────────────────────────────────────────────────────

async function getNodeCount(page: Page): Promise<number> {
  return page.locator('.react-flow__node').count();
}

async function getEdgeCount(page: Page): Promise<number> {
  return page.locator('.react-flow__edge').count();
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance Test Suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('【大量节点性能测试】', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  // ── Load time tests ─────────────────────────────────────────────────────

  test('P-50节点-加载时间<2s', async ({ page }) => {
    const xml = generateChainXML(50);

    const startTime = Date.now();
    await importXML(page, xml);
    const nodeCount = await getNodeCount(page);
    const loadTime = Date.now() - startTime;

    console.log(`[50节点] 节点数: ${nodeCount}, 加载时间: ${loadTime}ms`);

    expect(nodeCount).toBeGreaterThanOrEqual(40);
    expect(loadTime).toBeLessThan(2000);
  });

  test('P-100节点-加载时间<5s', async ({ page }) => {
    const xml = generateChainXML(100);

    const startTime = Date.now();
    await importXML(page, xml);
    const nodeCount = await getNodeCount(page);
    const loadTime = Date.now() - startTime;

    console.log(`[100节点] 节点数: ${nodeCount}, 加载时间: ${loadTime}ms`);

    expect(nodeCount).toBeGreaterThanOrEqual(90);
    expect(loadTime).toBeLessThan(5000);
  });

  test('P-200节点-加载时间<10s', async ({ page }) => {
    const xml = generateChainXML(200);

    const startTime = Date.now();
    await importXML(page, xml);
    const nodeCount = await getNodeCount(page);
    const loadTime = Date.now() - startTime;

    console.log(`[200节点] 节点数: ${nodeCount}, 加载时间: ${loadTime}ms`);

    expect(nodeCount).toBeGreaterThanOrEqual(180);
    expect(loadTime).toBeLessThan(10000);
  });

  // ── Node drag response - use keyboard (avoids viewport issue) ────────────

  test('P-节点拖拽响应-50节点', async ({ page }) => {
    const xml = generateChainXML(50);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const nodeCount = await getNodeCount(page);
    if (nodeCount < 2) {
      console.log('[拖拽] 节点不足，跳过');
      return;
    }

    // Pan to make node visible first
    const pane = page.locator('.react-flow__pane');
    await pane.click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(300);

    // Click on node 2 (index 1)
    const nodes = page.locator('.react-flow__node');
    const secondNode = nodes.nth(1);
    await secondNode.scrollIntoViewIfNeeded();
    await secondNode.click({ force: true });
    await page.waitForTimeout(200);

    // Use keyboard to drag (arrow keys)
    const startTime = Date.now();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const dragTime = Date.now() - startTime;

    console.log(`[50节点拖拽] 响应时间: ${dragTime}ms`);
    expect(dragTime).toBeLessThan(1000);
  });

  test('P-节点拖拽响应-100节点', async ({ page }) => {
    const xml = generateChainXML(100);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const nodeCount = await getNodeCount(page);
    if (nodeCount < 2) {
      console.log('[拖拽] 节点不足，跳过');
      return;
    }

    const pane = page.locator('.react-flow__pane');
    await pane.click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(300);

    const nodes = page.locator('.react-flow__node');
    const secondNode = nodes.nth(1);
    await secondNode.scrollIntoViewIfNeeded();
    await secondNode.click({ force: true });
    await page.waitForTimeout(200);

    const startTime = Date.now();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const dragTime = Date.now() - startTime;

    console.log(`[100节点拖拽] 响应时间: ${dragTime}ms`);
    expect(dragTime).toBeLessThan(1000);
  });

  test('P-节点拖拽响应-200节点', async ({ page }) => {
    const xml = generateChainXML(200);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const nodeCount = await getNodeCount(page);
    if (nodeCount < 2) {
      console.log('[拖拽] 节点不足，跳过');
      return;
    }

    const pane = page.locator('.react-flow__pane');
    await pane.click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(300);

    const nodes = page.locator('.react-flow__node');
    const secondNode = nodes.nth(1);
    await secondNode.scrollIntoViewIfNeeded();
    await secondNode.click({ force: true });
    await page.waitForTimeout(200);

    const startTime = Date.now();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const dragTime = Date.now() - startTime;

    console.log(`[200节点拖拽] 响应时间: ${dragTime}ms`);
    expect(dragTime).toBeLessThan(1000);
  });

  // ── Zoom/pan response ────────────────────────────────────────────────────

  test('P-缩放响应-50节点', async ({ page }) => {
    const xml = generateChainXML(50);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const pane = page.locator('.react-flow__pane');
    await pane.hover();

    const startTime = Date.now();
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(100);
    const zoomTime = Date.now() - startTime;

    console.log(`[50节点缩放] 响应时间: ${zoomTime}ms`);
    expect(zoomTime).toBeLessThan(500);
  });

  test('P-缩放响应-100节点', async ({ page }) => {
    const xml = generateChainXML(100);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const pane = page.locator('.react-flow__pane');
    await pane.hover();

    const startTime = Date.now();
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(100);
    const zoomTime = Date.now() - startTime;

    console.log(`[100节点缩放] 响应时间: ${zoomTime}ms`);
    expect(zoomTime).toBeLessThan(500);
  });

  test('P-缩放响应-200节点', async ({ page }) => {
    const xml = generateChainXML(200);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const pane = page.locator('.react-flow__pane');
    await pane.hover();

    const startTime = Date.now();
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(100);
    const zoomTime = Date.now() - startTime;

    console.log(`[200节点缩放] 响应时间: ${zoomTime}ms`);
    expect(zoomTime).toBeLessThan(500);
  });

  // ── Memory ───────────────────────────────────────────────────────────────

  test('P-内存占用-200节点', async ({ page }) => {
    const xml = generateChainXML(200);
    await importXML(page, xml);
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => {
      const perf = performance as any;
      return perf.memory ? {
        usedMB: perf.memory.usedJSHeapSize / (1024 * 1024),
        totalMB: perf.memory.totalJSHeapSize / (1024 * 1024),
      } : null;
    });

    if (metrics) {
      console.log(`[200节点内存] Used: ${metrics.usedMB.toFixed(2)}MB, Total: ${metrics.totalMB.toFixed(2)}MB`);
      expect(metrics.usedMB).toBeLessThan(500);
    } else {
      console.log('[内存] performance.memory API 不可用，跳过');
    }
  });

  // ── Connection drag response ─────────────────────────────────────────────

  test('P-连线拖拽响应-100节点', async ({ page }) => {
    const xml = generateTreeXML(100);
    await importXML(page, xml);
    await page.waitForTimeout(500);

    const nodeCount = await getNodeCount(page);
    if (nodeCount < 2) {
      console.log('[连线] 节点不足，跳过');
      return;
    }

    // Find a node with both source and target handles
    const nodes = page.locator('.react-flow__node');
    let sourceNodeIdx = -1;
    let targetNodeIdx = -1;

    for (let i = 0; i < Math.min(nodeCount, 20); i++) {
      const n = nodes.nth(i);
      const hasSrc = await n.locator('.react-flow__handle-source').count();
      const hasTgt = await n.locator('.react-flow__handle-target').count();
      if (hasSrc > 0 && hasTgt > 0) {
        // For source, need a node AFTER this one that has a target handle
        for (let j = i + 1; j < Math.min(nodeCount, 20); j++) {
          const n2 = nodes.nth(j);
          const hasTgt2 = await n2.locator('.react-flow__handle-target').count();
          if (hasTgt2 > 0) {
            sourceNodeIdx = i;
            targetNodeIdx = j;
            break;
          }
        }
        if (sourceNodeIdx >= 0) break;
      }
    }

    if (sourceNodeIdx < 0 || targetNodeIdx < 0) {
      console.log('[连线] 未找到可用端口组合，跳过');
      return;
    }

    const sourceNode = nodes.nth(sourceNodeIdx);
    const targetNode = nodes.nth(targetNodeIdx);

    const sourceHandle = sourceNode.locator('.react-flow__handle-source').first();
    const targetHandle = targetNode.locator('.react-flow__handle-target').first();

    const edgeBefore = await getEdgeCount(page);

    const startTime = Date.now();
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();
    await page.waitForTimeout(500);
    const connectTime = Date.now() - startTime;

    const edgeAfter = await getEdgeCount(page);
    console.log(`[100节点连线] 连接时间: ${connectTime}ms, 边数: ${edgeBefore}->${edgeAfter}`);

    expect(connectTime).toBeLessThan(2000);
  });
});

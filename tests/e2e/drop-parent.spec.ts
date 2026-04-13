import { expect, test } from '@playwright/test';

test('dropped node stays on canvas without auto-connecting an edge', async ({ page }) => {
  await page.goto('/');

  // Open Add Model modal
  await page.getByRole('button', { name: '+ Add Model' }).click();

  // Fill in the node type name (using the actual placeholder text from NodeModelModal)
  const nodeNameInput = page.getByPlaceholder('e.g. MoveToGoal');
  await nodeNameInput.fill('E2EAction');

  // Click Create to add the model
  await page.getByRole('button', { name: 'Create' }).click();

  const paletteItem = page.locator('.palette-item', { hasText: 'E2EAction' }).first();
  const pane = page.locator('.react-flow__pane');
  const edges = page.locator('.bt-flow-edge');
  await expect(paletteItem).toBeVisible();
  await expect(pane).toBeVisible();
  await expect(edges).toHaveCount(0);

  await paletteItem.dragTo(pane, {
    targetPosition: { x: 420, y: 220 },
  });

  await page.waitForTimeout(1200);

  const droppedNode = page.locator('.react-flow__node', { hasText: 'E2EAction' });
  await expect(droppedNode).toHaveCount(1);
  await expect(edges).toHaveCount(0);
});

test('dragged node keeps its manual position after autosave delay', async ({ page }) => {
  await page.goto('/');

  const node = page.locator('.react-flow__node').first();
  await expect(node).toBeVisible();

  const beforeBox = await node.boundingBox();
  expect(beforeBox).not.toBeNull();

  if (!beforeBox) {
    throw new Error('Node bounding box not available before drag');
  }

  await page.mouse.move(beforeBox.x + beforeBox.width / 2, beforeBox.y + beforeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(beforeBox.x + beforeBox.width / 2 + 140, beforeBox.y + beforeBox.height / 2 + 120, {
    steps: 8,
  });
  await page.mouse.up();

  await page.waitForTimeout(1200);

  const afterBox = await node.boundingBox();
  expect(afterBox).not.toBeNull();

  if (!afterBox) {
    throw new Error('Node bounding box not available after drag');
  }

  expect(afterBox.x).toBeGreaterThan(beforeBox.x + 80);
  expect(afterBox.y).toBeGreaterThan(beforeBox.y + 60);
});

test('edge can be deleted with its delete button', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '📂 Sample' }).click();
  await page.waitForTimeout(1500);

  // Wait for canvas to render with nodes
  const canvas = page.locator('.react-flow__pane');
  await expect(canvas).toBeVisible({ timeout: 10000 });

  // Use .bt-flow-edge for reliable counting (each edge has one such element)
  const edges = page.locator('.bt-flow-edge');
  await expect(edges.first()).toBeVisible({ timeout: 10000 });

  const countBefore = await edges.count();
  // Use position-based click because SVG text elements need exact positioning
  await page.locator('.bt-edge-delete').first().click({ position: { x: 5, y: 10 } });
  // Wait for state update and re-render
  await page.waitForTimeout(2000);

  await expect(edges).toHaveCount(countBefore - 1);
});

import { type Page } from '@playwright/test';

/**
 * Load the sample tree by clicking the Sample button and waiting for canvas update
 */
export async function loadSampleTree(page: Page): Promise<void> {
  await page.getByRole('button', { name: '📂 Sample' }).click();
  await page.waitForTimeout(1000);
}

/**
 * Wait for canvas to be ready with nodes
 */
export async function waitForCanvasReady(page: Page): Promise<void> {
  const pane = page.locator('.react-flow__pane');
  await expect(pane).toBeVisible({ timeout: 10000 });
}

/**
 * Drag a palette item to the canvas
 */
export async function dragNodeToCanvas(
  page: Page,
  nodeText: string,
  x: number,
  y: number
): Promise<void> {
  const paletteItem = page.locator('.palette-item', { hasText: nodeText }).first();
  const pane = page.locator('.react-flow__pane');
  await paletteItem.dragTo(pane, { targetPosition: { x, y } });
  await page.waitForTimeout(500);
}

/**
 * Get a node by its label text
 */
export function getNodeLocator(page: Page, label: string) {
  return page.locator('.react-flow__node', { hasText: label });
}

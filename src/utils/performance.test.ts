/**
 * Performance benchmark for large tree rendering.
 * Measures:
 * 1. Tree-to-flow conversion time for trees with 50, 100, 200 nodes
 * 2. Layout computation time
 * 3. Descendant ID computation time
 */
import { describe, it, expect } from 'vitest';
import { treeToFlow, getDescendantIds } from './btFlow';
import { autoLayout } from './btLayout';
import type { BTTree, BTTreeNode } from '../types/bt';

function buildDeepTree(depth: number, breadth: number): BTTreeNode {
  if (depth === 0) {
    return {
      id: `n_${Math.random().toString(36).slice(2, 8)}`,
      type: 'Action',
      ports: {},
      children: [],
    };
  }
  const children: BTTreeNode[] = [];
  for (let i = 0; i < breadth; i++) {
    children.push(buildDeepTree(depth - 1, breadth));
  }
  return {
    id: `n_${Math.random().toString(36).slice(2, 8)}`,
    type: 'Sequence',
    ports: {},
    children,
  };
}

function countNodes(node: BTTreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

describe('Performance Benchmarks', () => {
  it('treeToFlow handles 50 nodes within acceptable time', () => {
    const root = buildDeepTree(3, 3); // ~40 nodes
    const tree: BTTree = { id: 'bench', root };
    const nodeCount = countNodes(root);
    expect(nodeCount).toBeGreaterThan(30);

    const start = performance.now();
    const { nodes } = treeToFlow(tree, []);
    const elapsed = performance.now() - start;

    expect(nodes.length).toBe(nodeCount);
    expect(elapsed).toBeLessThan(50); // Should be < 50ms
  });

  it('treeToFlow handles 100+ nodes within acceptable time', () => {
    const root = buildDeepTree(4, 3); // ~121 nodes
    const tree: BTTree = { id: 'bench', root };
    const nodeCount = countNodes(root);
    expect(nodeCount).toBeGreaterThan(100);

    const start = performance.now();
    const { nodes } = treeToFlow(tree, []);
    const elapsed = performance.now() - start;

    expect(nodes.length).toBe(nodeCount);
    expect(elapsed).toBeLessThan(100); // Should be < 100ms
  });

  it('autoLayout handles 100+ nodes within acceptable time', () => {
    const root = buildDeepTree(4, 3); // ~121 nodes
    const tree: BTTree = { id: 'bench', root };
    const { nodes, edges } = treeToFlow(tree, []);

    const start = performance.now();
    const laidOut = autoLayout(nodes, edges);
    const elapsed = performance.now() - start;

    expect(laidOut.length).toBe(nodes.length);
    expect(elapsed).toBeLessThan(200); // Should be < 200ms for 100+ nodes
  });

  it('getDescendantIds is fast for deep trees', () => {
    const root = buildDeepTree(5, 2); // ~63 nodes
    const tree: BTTree = { id: 'bench', root };
    const { edges } = treeToFlow(tree, []);

    const start = performance.now();
    const descendants = getDescendantIds(root.id, edges);
    const elapsed = performance.now() - start;

    // All non-root nodes should be descendants of root
    expect(descendants.length).toBe(countNodes(root) - 1);
    expect(elapsed).toBeLessThan(5); // Should be < 5ms
  });

  it('combined pipeline: treeToFlow + autoLayout for 200+ nodes', () => {
    const root = buildDeepTree(5, 3); // ~364 nodes
    const tree: BTTree = { id: 'bench', root };
    const nodeCount = countNodes(root);
    expect(nodeCount).toBeGreaterThan(200);

    const start = performance.now();
    const { nodes, edges } = treeToFlow(tree, []);
    const laidOut = autoLayout(nodes, edges);
    const elapsed = performance.now() - start;

    expect(laidOut.length).toBe(nodeCount);
    // Full pipeline should still be under 500ms
    expect(elapsed).toBeLessThan(500);
  });
});

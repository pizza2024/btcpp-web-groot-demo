import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { autoLayout } from './btLayout';

describe('autoLayout', () => {
  it('assigns numeric positions to all nodes', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'child', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'root', target: 'child' }];

    const laidOut = autoLayout(nodes, edges);
    const root = laidOut.find((n) => n.id === 'root');
    const child = laidOut.find((n) => n.id === 'child');

    expect(root).toBeDefined();
    expect(child).toBeDefined();
    expect(typeof root?.position.x).toBe('number');
    expect(typeof root?.position.y).toBe('number');
    expect(typeof child?.position.x).toBe('number');
    expect(typeof child?.position.y).toBe('number');
  });

  it('places child below parent in top-to-bottom layout', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'child', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'root', target: 'child' }];

    const laidOut = autoLayout(nodes, edges);
    const root = laidOut.find((n) => n.id === 'root');
    const child = laidOut.find((n) => n.id === 'child');

    expect(root).toBeDefined();
    expect(child).toBeDefined();
    expect((child?.position.y ?? 0) > (root?.position.y ?? 0)).toBe(true);
  });

  it('uses measured node height for vertical layer spacing', () => {
    const tallRootHeight = 220;
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {}, height: tallRootHeight },
      { id: 'child', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'root', target: 'child' }];

    const laidOut = autoLayout(nodes, edges);
    const root = laidOut.find((n) => n.id === 'root');
    const child = laidOut.find((n) => n.id === 'child');

    expect(root).toBeDefined();
    expect(child).toBeDefined();
    expect((child?.position.y ?? 0) - (root?.position.y ?? 0)).toBeGreaterThanOrEqual(tallRootHeight + 64);
  });

  it('preserves sibling order from childIndex metadata', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'script-4', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0, label: '4' } },
      { id: 'middle', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1, label: '1' } },
      { id: 'script-3', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 2, label: '3' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'script-4' },
      { id: 'e2', source: 'root', target: 'middle' },
      { id: 'e3', source: 'root', target: 'script-3' },
    ];

    const laidOut = autoLayout(nodes, edges);
    const ordered = ['script-4', 'middle', 'script-3']
      .map((id) => laidOut.find((node) => node.id === id))
      .filter((node): node is Node => Boolean(node));

    expect(ordered).toHaveLength(3);
    expect(ordered[0].position.x).toBeLessThan(ordered[1].position.x);
    expect(ordered[1].position.x).toBeLessThan(ordered[2].position.x);
  });

  it('keeps single-child chains vertically aligned with parent', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'left-decorator', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'right-decorator', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'left-sequence', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'right-sequence', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'left-decorator' },
      { id: 'e2', source: 'root', target: 'right-decorator' },
      { id: 'e3', source: 'left-decorator', target: 'left-sequence' },
      { id: 'e4', source: 'right-decorator', target: 'right-sequence' },
    ];

    const laidOut = autoLayout(nodes, edges);
    const leftDecorator = laidOut.find((n) => n.id === 'left-decorator');
    const rightDecorator = laidOut.find((n) => n.id === 'right-decorator');
    const leftSequence = laidOut.find((n) => n.id === 'left-sequence');
    const rightSequence = laidOut.find((n) => n.id === 'right-sequence');

    expect(leftDecorator).toBeDefined();
    expect(rightDecorator).toBeDefined();
    expect(leftSequence).toBeDefined();
    expect(rightSequence).toBeDefined();

    expect(leftSequence?.position.x).toBe(leftDecorator?.position.x);
    expect(rightSequence?.position.x).toBe(rightDecorator?.position.x);
  });

  it('keeps sibling subtrees separated without horizontal interleaving', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'left-seq', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'right-seq', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'l1', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'l2', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'r1', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'r2', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'left-seq' },
      { id: 'e2', source: 'root', target: 'right-seq' },
      { id: 'e3', source: 'left-seq', target: 'l1' },
      { id: 'e4', source: 'left-seq', target: 'l2' },
      { id: 'e5', source: 'right-seq', target: 'r1' },
      { id: 'e6', source: 'right-seq', target: 'r2' },
    ];

    const laidOut = autoLayout(nodes, edges);
    const leftSubtreeNodes = ['left-seq', 'l1', 'l2']
      .map((id) => laidOut.find((n) => n.id === id))
      .filter((n): n is Node => Boolean(n));
    const rightSubtreeNodes = ['right-seq', 'r1', 'r2']
      .map((id) => laidOut.find((n) => n.id === id))
      .filter((n): n is Node => Boolean(n));

    expect(leftSubtreeNodes).toHaveLength(3);
    expect(rightSubtreeNodes).toHaveLength(3);

    const leftMaxX = Math.max(...leftSubtreeNodes.map((n) => n.position.x));
    const rightMinX = Math.min(...rightSubtreeNodes.map((n) => n.position.x));

    expect(leftMaxX).toBeLessThan(rightMinX);
  });

  it('compacts large top-level gaps between a leaf and a wide sibling subtree', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'leaf', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'decorator', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'seq', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'a', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'b', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'c', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 2 } },
      { id: 'd', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 3 } },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'leaf' },
      { id: 'e2', source: 'root', target: 'decorator' },
      { id: 'e3', source: 'decorator', target: 'seq' },
      { id: 'e4', source: 'seq', target: 'a' },
      { id: 'e5', source: 'seq', target: 'b' },
      { id: 'e6', source: 'seq', target: 'c' },
      { id: 'e7', source: 'seq', target: 'd' },
    ];

    const laidOut = autoLayout(nodes, edges);
    const leaf = laidOut.find((n) => n.id === 'leaf');
    const decorator = laidOut.find((n) => n.id === 'decorator');

    expect(leaf).toBeDefined();
    expect(decorator).toBeDefined();

    const horizontalGap = (decorator?.position.x ?? 0) - (leaf?.position.x ?? 0);
    expect(horizontalGap).toBeLessThan(260);
    expect(horizontalGap).toBeGreaterThan(150);
  });

  it('keeps the top-level parent centered over its children after compaction', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'left', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'middle', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'right', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 2 } },
      { id: 'm1', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'm2', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'm3', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 2 } },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'left' },
      { id: 'e2', source: 'root', target: 'middle' },
      { id: 'e3', source: 'root', target: 'right' },
      { id: 'e4', source: 'middle', target: 'm1' },
      { id: 'e5', source: 'middle', target: 'm2' },
      { id: 'e6', source: 'middle', target: 'm3' },
    ];

    const laidOut = autoLayout(nodes, edges);
    const root = laidOut.find((n) => n.id === 'root');
    const left = laidOut.find((n) => n.id === 'left');
    const right = laidOut.find((n) => n.id === 'right');

    expect(root).toBeDefined();
    expect(left).toBeDefined();
    expect(right).toBeDefined();

    const rootCenter = (root?.position.x ?? 0) + 100;
    const leftCenter = (left?.position.x ?? 0) + 100;
    const rightCenter = (right?.position.x ?? 0) + 100;
    const expectedCenter = (leftCenter + rightCenter) / 2;

    expect(Math.abs(rootCenter - expectedCenter)).toBeLessThanOrEqual(1);
  });

  it('uses soft-even sibling spacing without stretching every gap', () => {
    const nodes: Node[] = [
      { id: 'root', type: 'btNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'c1', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'c2', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'c3', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 2 } },
      { id: 'c4', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 3 } },
      { id: 'c2a', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'c2b', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'c3a', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 0 } },
      { id: 'c3b', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 1 } },
      { id: 'c3c', type: 'btNode', position: { x: 0, y: 0 }, data: { childIndex: 2 } },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'c1' },
      { id: 'e2', source: 'root', target: 'c2' },
      { id: 'e3', source: 'root', target: 'c3' },
      { id: 'e4', source: 'root', target: 'c4' },
      { id: 'e5', source: 'c2', target: 'c2a' },
      { id: 'e6', source: 'c2', target: 'c2b' },
      { id: 'e7', source: 'c3', target: 'c3a' },
      { id: 'e8', source: 'c3', target: 'c3b' },
      { id: 'e9', source: 'c3', target: 'c3c' },
    ];

    const laidOut = autoLayout(nodes, edges);
    const centers = ['c1', 'c2', 'c3', 'c4']
      .map((id) => laidOut.find((node) => node.id === id))
      .filter((node): node is Node => Boolean(node))
      .map((node) => node.position.x + 100);

    expect(centers).toHaveLength(4);

    const gaps = [centers[1] - centers[0], centers[2] - centers[1], centers[3] - centers[2]];
    const maxGap = Math.max(...gaps);
    const minGap = Math.min(...gaps);

    expect(minGap).toBeGreaterThan(100);
    expect(maxGap - minGap).toBeGreaterThan(80);
    expect(maxGap).toBeLessThan(560);
  });
});

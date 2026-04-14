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
});

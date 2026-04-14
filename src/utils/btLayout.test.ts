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
});

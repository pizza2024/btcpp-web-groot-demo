import { describe, expect, it } from 'vitest';
import type { BTTree } from '../types/bt';
import type { Edge, Node } from '@xyflow/react';
import { flowToTree, getAttachedNodeIds, getDetachedNodeIds, isSameTreeStructure, treeToFlow } from './btFlow';

describe('treeToFlow', () => {
  it('converts tree nodes and edges with expected metadata', () => {
    const tree: BTTree = {
      id: 'MainTree',
      root: {
        id: 'root',
        type: 'Sequence',
        name: 'RootSequence',
        ports: {},
        children: [
          {
            id: 'leaf-1',
            type: 'CustomAction',
            ports: { goal: '{target}' },
            children: [],
          },
        ],
      },
    };

    const { nodes, edges } = treeToFlow(tree, [{ type: 'CustomAction', category: 'Action' }]);

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);

    const rootNode = nodes.find((n) => n.id === 'root');
    const childNode = nodes.find((n) => n.id === 'leaf-1');

    expect(rootNode?.data).toMatchObject({
      label: 'RootSequence',
      nodeType: 'Sequence',
      category: 'Control',
    });

    expect(childNode?.data).toMatchObject({
      label: 'CustomAction',
      nodeType: 'CustomAction',
      category: 'Action',
      childIndex: 0,
    });

    expect(edges[0]).toMatchObject({
      source: 'root',
      target: 'leaf-1',
      type: 'btEdge',
    });
  });
});

describe('flowToTree', () => {
  it('rebuilds a behavior tree from flow nodes and edges', () => {
    const nodes: Node[] = [
      {
        id: 'root',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Sequence', label: 'Sequence', ports: {} },
      },
      {
        id: 'c1',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'ActionA', label: 'Move', ports: { speed: '1.0' } },
      },
    ];

    const edges: Edge[] = [{ id: 'e1', source: 'root', target: 'c1' }];

    const tree = flowToTree('TreeA', nodes, edges);

    expect(tree.id).toBe('TreeA');
    expect(tree.root.type).toBe('Sequence');
    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0]).toMatchObject({
      id: 'c1',
      type: 'ActionA',
      name: 'Move',
      ports: { speed: '1.0' },
      children: [],
    });
  });

  it('orders siblings by explicit source handle before serializing', () => {
    const nodes: Node[] = [
      {
        id: 'root',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Sequence', label: 'Sequence', ports: {} },
      },
      {
        id: 'left',
        type: 'btNode',
        position: { x: -100, y: 100 },
        data: { nodeType: 'Script', label: 'Script', ports: { code: '' } },
      },
      {
        id: 'right',
        type: 'btNode',
        position: { x: 100, y: 100 },
        data: { nodeType: 'SetBlackboard', label: 'Hello', ports: { value: '', output_key: '' } },
      },
    ];

    const edges: Edge[] = [
      { id: 'e2', source: 'root', target: 'right', sourceHandle: 'out1' },
      { id: 'e1', source: 'root', target: 'left', sourceHandle: 'out0' },
    ];

    const tree = flowToTree('TreeOrdered', nodes, edges);

    expect(tree.root.children.map((child) => child.id)).toEqual(['left', 'right']);
  });

  it('falls back to canvas position when source handles are missing', () => {
    const nodes: Node[] = [
      {
        id: 'root',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Sequence', label: 'Sequence', ports: {} },
      },
      {
        id: 'right',
        type: 'btNode',
        position: { x: 120, y: 100 },
        data: { nodeType: 'Script', label: 'Script', ports: { code: '' } },
      },
      {
        id: 'left',
        type: 'btNode',
        position: { x: -120, y: 100 },
        data: { nodeType: 'Script', label: 'Script', ports: { code: '' } },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'right' },
      { id: 'e2', source: 'root', target: 'left' },
    ];

    const tree = flowToTree('TreeByPosition', nodes, edges);

    expect(tree.root.children.map((child) => child.id)).toEqual(['left', 'right']);
  });

  it('throws when no root can be found', () => {
    const nodes: Node[] = [
      {
        id: 'a',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Sequence', label: 'Sequence', ports: {} },
      },
      {
        id: 'b',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Action', label: 'Action', ports: {} },
      },
    ];

    const edges: Edge[] = [
      { id: 'ab', source: 'a', target: 'b' },
      { id: 'ba', source: 'b', target: 'a' },
    ];

    expect(() => flowToTree('TreeCycle', nodes, edges)).toThrow('No root node found');
  });

  it('picks ROOT-type node when multiple roots exist (e.g. after edge deletion)', () => {
    // After deleting an edge from ROOT->child, both ROOT and child become roots.
    // flowToTree should prefer the ROOT-type node so the correct tree is saved.
    const nodes: Node[] = [
      { id: 'root-a', type: 'btNode', position: { x: 0, y: 0 }, data: { nodeType: 'Sequence', label: 'Sequence', ports: {} } },
      { id: 'root-b', type: 'btNode', position: { x: 0, y: 0 }, data: { nodeType: 'ROOT', label: 'ROOT', ports: {} } },
      { id: 'child1', type: 'btNode', position: { x: 0, y: 0 }, data: { nodeType: 'Action', label: 'Action', ports: {} } },
    ];
    // root-b->child1 edge exists; no edges to root-a (it's disconnected)
    const edges: Edge[] = [
      { id: 'e1', source: 'root-b', target: 'child1' },
    ];
    // root-a and root-b both have no incoming edges
    // Should pick root-b (ROOT-type) as the tree root
    const tree = flowToTree('TreeMultiRoot', nodes, edges);
    expect(tree.root.id).toBe('root-b');
    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].id).toBe('child1');
  });

  it('builds tree from reachable nodes when disconnected nodes exist', () => {
    // When disconnected nodes exist (e.g. orphan subtree after edge deletion),
    // flowToTree should NOT throw. It builds from reachable nodes and ignores orphans.
    // Setup: Two disconnected subtrees - one rooted at orphan-root (with child),
    // and one at unreachable-root (with child). Neither has incoming edges.
    // The first root-like node in the array is picked as tree root.
    const nodes: Node[] = [
      { id: 'orphan-root', type: 'btNode', position: { x: 0, y: 0 }, data: { nodeType: 'Sequence', label: 'Sequence', ports: {} } },
      { id: 'orphan-child', type: 'btNode', position: { x: 0, y: 0 }, data: { nodeType: 'Action', label: 'Action', ports: {} } },
      { id: 'unreachable-root', type: 'btNode', position: { x: 0, y: 0 }, data: { nodeType: 'Fallback', label: 'Fallback', ports: {} } },
    ];
    // Only orphan-root->orphan-child edge; unreachable-root is truly orphaned
    const edges: Edge[] = [
      { id: 'e1', source: 'orphan-root', target: 'orphan-child' },
    ];

    // Should NOT throw - orphan-root is picked (no incoming edges, first such node)
    const tree = flowToTree('TreeDisconnected', nodes, edges);
    expect(tree.id).toBe('TreeDisconnected');
    expect(tree.root.id).toBe('orphan-root');
    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].id).toBe('orphan-child');
    // unreachable-root is silently excluded (not connected to tree root)
  });
});

describe('detached node tracking', () => {
  it('keeps a node as detached after removing its only ROOT connection', () => {
    const nodes: Node[] = [
      {
        id: 'root',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'ROOT', label: 'ROOT', ports: {}, isRoot: true },
      },
      {
        id: 'action',
        type: 'btNode',
        position: { x: 120, y: 0 },
        data: { nodeType: 'Action', label: 'Action', ports: {}, category: 'Action' },
      },
    ];

    const edges: Edge[] = [{ id: 'e1', source: 'root', target: 'action' }];
    const edgesAfterDelete: Edge[] = [];

    expect(getAttachedNodeIds(nodes, edges)).toEqual(new Set(['root', 'action']));
    expect(getAttachedNodeIds(nodes, edgesAfterDelete)).toEqual(new Set(['root']));
    expect(getDetachedNodeIds(nodes, edgesAfterDelete)).toEqual(new Set(['action']));
  });
});

describe('isSameTreeStructure', () => {
  it('treats equivalent trees as equal', () => {
    const left: BTTree = {
      id: 'MainTree',
      root: {
        id: 'root',
        type: 'Sequence',
        ports: { retry: '3' },
        children: [
          {
            id: 'child',
            type: 'Action',
            name: 'Move',
            ports: {},
            children: [],
          },
        ],
      },
    };

    const right: BTTree = {
      id: 'MainTree',
      root: {
        id: 'root',
        type: 'Sequence',
        ports: { retry: '3' },
        children: [
          {
            id: 'child',
            type: 'Action',
            name: 'Move',
            ports: {},
            children: [],
          },
        ],
      },
    };

    expect(isSameTreeStructure(left, right)).toBe(true);
  });

  it('detects structural differences', () => {
    const left: BTTree = {
      id: 'MainTree',
      root: {
        id: 'root',
        type: 'Sequence',
        ports: {},
        children: [],
      },
    };

    const right: BTTree = {
      id: 'MainTree',
      root: {
        id: 'root',
        type: 'Sequence',
        ports: {},
        children: [
          {
            id: 'child',
            type: 'Action',
            ports: {},
            children: [],
          },
        ],
      },
    };

    expect(isSameTreeStructure(left, right)).toBe(false);
  });
});

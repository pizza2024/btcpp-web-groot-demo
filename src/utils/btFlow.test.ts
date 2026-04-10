import { describe, expect, it } from 'vitest';
import type { BTTree } from '../types/bt';
import type { Edge, Node } from '@xyflow/react';
import { flowToTree, isSameTreeStructure, treeToFlow } from './btFlow';

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
      type: 'smoothstep',
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

  it('throws when multiple roots are present', () => {
    const nodes: Node[] = [
      {
        id: 'root-a',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Sequence', label: 'Sequence', ports: {} },
      },
      {
        id: 'root-b',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Fallback', label: 'Fallback', ports: {} },
      },
    ];

    expect(() => flowToTree('TreeMultiRoot', nodes, [])).toThrow('Multiple root nodes found');
  });

  it('throws when disconnected nodes exist', () => {
    const nodes: Node[] = [
      {
        id: 'root',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Sequence', label: 'Sequence', ports: {} },
      },
      {
        id: 'child',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Action', label: 'Action', ports: {} },
      },
      {
        id: 'd1',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Action', label: 'Action', ports: {} },
      },
      {
        id: 'd2',
        type: 'btNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'Action', label: 'Action', ports: {} },
      },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'child' },
      { id: 'e2', source: 'd1', target: 'd2' },
      { id: 'e3', source: 'd2', target: 'd1' },
    ];

    expect(() => flowToTree('TreeDisconnected', nodes, edges)).toThrow('Disconnected nodes found');
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

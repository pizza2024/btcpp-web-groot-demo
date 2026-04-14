/**
 * 循环引用 + 并发删除 测试
 * 对应 test-design-loop-concurrency.md
 *
 * 运行: npm test -- src/utils/btLoopConcurrency.test.ts
 */

import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import { flowToTree, treeToFlow, getDescendantIds } from './btFlow';

// ─── 辅助函数（从 BTCanvas.tsx 提取）──────────────────────────────────────────

function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  existingEdges: Edge[]
): boolean {
  const visited = new Set<string>();
  const stack = [targetId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const edge of existingEdges) {
      if (edge.source === cur) stack.push(edge.target);
    }
  }
  return false;
}

function isValidConnection(sourceNode: Node, existingEdges: Edge[]): boolean {
  const sourceCategory = (sourceNode.data as { category?: string }).category;
  if (sourceCategory === 'Action' || sourceCategory === 'Condition') return false;
  if (sourceCategory === 'ROOT') {
    if (existingEdges.filter((e) => e.source === sourceNode.id).length > 0) return false;
  }
  if (sourceCategory === 'Decorator') {
    if (existingEdges.filter((e) => e.source === sourceNode.id).length > 0) return false;
  }
  return true;
}

function canConnect(
  sourceId: string,
  sourceCategory: string,
  targetId: string,
  existingEdges: Edge[],
  nodes: Node[]
): { allowed: boolean; reason?: string } {
  const sourceNode: Node = {
    id: sourceId,
    type: 'btNode',
    position: { x: 0, y: 0 },
    data: { category: sourceCategory, nodeType: sourceId },
  };
  if (!isValidConnection(sourceNode, existingEdges)) {
    return { allowed: false, reason: 'isValidConnection blocked' };
  }
  if (wouldCreateCycle(sourceId, targetId, existingEdges)) {
    return { allowed: false, reason: 'cycle detected' };
  }
  return { allowed: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// 一、循环引用检测测试
// ══════════════════════════════════════════════════════════════════════════════

describe('一、循环引用检测测试', () => {

  it('LOOP-001: 直接自循环 A → A → 拒绝（cycle detected）', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
    ];
    const edges: Edge[] = [];
    const r = canConnect('A', 'Control', 'A', edges, nodes);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cycle detected');
  });

  it('LOOP-002: 间接自循环 A → B → A → 拒绝（cycle detected）', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
      { id: 'B', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Fallback' } },
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'A', target: 'B' }];
    const r = canConnect('B', 'Control', 'A', edges, nodes);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cycle detected');
  });

  it('LOOP-003: 长链循环 A → B → C → D → E → A → 拒绝（cycle detected）', () => {
    const ids = ['A', 'B', 'C', 'D', 'E'];
    const nodes: Node[] = ids.map((id) => ({
      id, type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' }
    }));
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'C', target: 'D' },
      { id: 'e4', source: 'D', target: 'E' },
    ];
    const r = canConnect('E', 'Control', 'A', edges, nodes);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cycle detected');
  });

  it('LOOP-004: 复杂循环 G→B（G连回B）→ 拒绝（cycle detected）', () => {
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nodes: Node[] = ids.map((id) => ({
      id, type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' }
    }));
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'C', target: 'D' },
      { id: 'e4', source: 'D', target: 'E' },
      { id: 'e5', source: 'E', target: 'F' },
      { id: 'e6', source: 'F', target: 'G' },
    ];
    const r = canConnect('G', 'Control', 'B', edges, nodes);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cycle detected');
  });

  it('LOOP-005: Parent→A→B→C→Parent（同一祖先内循环）→ 拒绝', () => {
    const nodes: Node[] = [
      { id: 'Parent', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
      { id: 'A', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Fallback' } },
      { id: 'B', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
      { id: 'C', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Action' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'Parent', target: 'A' },
      { id: 'e2', source: 'A', target: 'B' },
      { id: 'e3', source: 'B', target: 'C' },
    ];
    const r = canConnect('C', 'Control', 'Parent', edges, nodes);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cycle detected');
  });

  it('LOOP-006: 循环检测时机 = 连接时实时阻止（非保存时、非运行时）', () => {
    // 验证 wouldCreateCycle 在连接建立前就被调用
    const nodes: Node[] = [
      { id: 'X', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
      { id: 'Y', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Fallback' } },
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'X', target: 'Y' }];
    const r = canConnect('Y', 'Control', 'X', edges, nodes);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cycle detected');
  });

  it('LOOP-BOUND-001: 合法树 A→B→C→D→E（无循环）→ 允许', () => {
    const ids = ['A', 'B', 'C', 'D', 'E'];
    const nodes: Node[] = ids.map((id) => ({
      id, type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' }
    }));
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'C', target: 'D' },
    ];
    const r = canConnect('D', 'Control', 'E', edges, nodes);
    expect(r.allowed).toBe(true);
  });

  it('LOOP-BOUND-002: 合法分叉树 A→B, A→C, C→D → 允许', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
      { id: 'B', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Action', nodeType: 'Action' } },
      { id: 'C', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Fallback' } },
      { id: 'D', type: 'btNode', position: { x: 0, y: 0 }, data: { category: 'Control', nodeType: 'Sequence' } },
    ];
    const nodes2: Node[] = [
      nodes[0],
      nodes[1],
      { ...nodes[2], data: { ...nodes[2].data, category: 'Control' } },
      { ...nodes[3], data: { ...nodes[3].data, category: 'Control' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'A', target: 'C' },
    ];
    const r = canConnect('C', 'Control', 'D', edges, nodes2);
    expect(r.allowed).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 二、并发删除场景测试
// ══════════════════════════════════════════════════════════════════════════════

describe('二、并发删除场景测试', () => {

  it('CD-001: 同时删除相邻节点 B 和 C → A 的子节点关系正确，D 成为孤儿被排除', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'A', type: 'Sequence', ports: {}, children: [
          {
            id: 'B', type: 'Sequence', ports: {}, children: [
              {
                id: 'C', type: 'Action', ports: {}, children: [
                  { id: 'D', type: 'Action', ports: {}, children: [] }
                ]
              }
            ]
          }
        ]
      }
    };

    const { nodes, edges } = treeToFlow(initialTree);

    const deleteIds = new Set(['B', 'C']);
    const nodesAfter = nodes.filter((n: Node) => !deleteIds.has(n.id));
    const edgesAfter = edges.filter((e: Edge) => !deleteIds.has(e.source) && !deleteIds.has(e.target));

    const resultTree = flowToTree('Tree', nodesAfter, edgesAfter);

    expect(resultTree.root.id).toBe('A');
    expect(resultTree.root.children).toHaveLength(0);
    function findNode(node: { id: string; children: unknown[] }, id: string): boolean {
      if (node.id === id) return true;
      return node.children.some((c) => findNode(c as { id: string; children: unknown[] }, id));
    }
    expect(findNode(resultTree.root, 'D')).toBe(false);
  });

  it('CD-002: 同时删除父子节点 B 和其子节点 D → B 及其子树全部删除', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'A', type: 'Sequence', ports: {}, children: [
          {
            id: 'B', type: 'Fallback', ports: {}, children: [
              { id: 'C', type: 'Action', ports: {}, children: [] },
              { id: 'D', type: 'Sequence', ports: {}, children: [
                { id: 'E', type: 'Action', ports: {}, children: [] }
              ]}
            ]
          }
        ]
      }
    };

    const { nodes, edges } = treeToFlow(initialTree);

    const deleteIds = new Set(['B', 'D']);
    const nodesAfter = nodes.filter((n: Node) => !deleteIds.has(n.id));
    const edgesAfter = edges.filter((e: Edge) => !deleteIds.has(e.source) && !deleteIds.has(e.target));

    const resultTree = flowToTree('Tree', nodesAfter, edgesAfter);

    function nodeIds(node: { id: string; children: unknown[] }): string[] {
      const ids = [node.id];
      node.children.forEach((c) => ids.push(...nodeIds(c as { id: string; children: unknown[] })));
      return ids;
    }
    const allIds = nodeIds(resultTree.root);

    expect(allIds).not.toContain('B');
    expect(allIds).not.toContain('D');
    expect(allIds).not.toContain('E');
    expect(allIds).toContain('A');
    // C 的父链断了（B 被删），C 成为孤儿被排除
    expect(allIds).not.toContain('C');
  });

  it('CD-003: 同时删除 B 节点和 B→C 连线 → 保存再加载后无悬挂连线', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'A', type: 'Sequence', ports: {}, children: [
          {
            id: 'B', type: 'Fallback', ports: {}, children: [
              { id: 'C', type: 'Action', ports: {}, children: [] }
            ]
          }
        ]
      }
    };

    const { nodes, edges } = treeToFlow(initialTree);

    const nodesAfter = nodes.filter((n: Node) => n.id !== 'B');
    const edgesAfter = edges.filter((e: Edge) => e.source !== 'B' && e.target !== 'B');

    const savedTree = flowToTree('Tree', nodesAfter, edgesAfter);
    const { nodes: reNodes, edges: reEdges } = treeToFlow(savedTree);
    const reloadedTree = flowToTree('Tree', reNodes, reEdges);

    function allNodeIds(treeNode: { id: string; children: unknown[] }): string[] {
      const ids = [treeNode.id];
      treeNode.children.forEach((c) => ids.push(...allNodeIds(c as { id: string; children: unknown[] })));
      return ids;
    }
    const treeNodeIds = new Set(allNodeIds(reloadedTree.root));
    const treeEdgeSources = reEdges.map((e: Edge) => e.source);
    const treeEdgeTargets = reEdges.map((e: Edge) => e.target);

    treeEdgeSources.forEach((src: string) => expect(treeNodeIds).toContain(src));
    treeEdgeTargets.forEach((tgt: string) => expect(treeNodeIds).toContain(tgt));
  });

  it('CD-004: 快速连续删除 A、B、C → 每次删除正确响应', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'A', type: 'Sequence', ports: {}, children: [
          {
            id: 'B', type: 'Fallback', ports: {}, children: [
              {
                id: 'C', type: 'Sequence', ports: {}, children: [
                  { id: 'D', type: 'Action', ports: {}, children: [] }
                ]
              }
            ]
          }
        ]
      }
    };

    let { nodes, edges } = treeToFlow(initialTree);

    // 第1次：删除 A
    nodes = nodes.filter((n: Node) => n.id !== 'A');
    edges = edges.filter((e: Edge) => e.source !== 'A' && e.target !== 'A');
    expect(() => flowToTree('Tree', nodes, edges)).not.toThrow();

    // 第2次：删除 B（此时 B 无父节点，C 成为新的 root）
    nodes = nodes.filter((n: Node) => n.id !== 'B');
    edges = edges.filter((e: Edge) => e.source !== 'B' && e.target !== 'B');
    const tree2 = flowToTree('Tree', nodes, edges);
    expect(tree2.root.id).toBe('C');
    expect(tree2.root.children).toHaveLength(1);
    expect(tree2.root.children[0].id).toBe('D');

    // 第3次：删除 C
    nodes = nodes.filter((n: Node) => n.id !== 'C');
    edges = edges.filter((e: Edge) => e.source !== 'C' && e.target !== 'C');
    const tree3 = flowToTree('Tree', nodes, edges);
    expect(tree3.root.id).toBe('D');
    expect(tree3.root.children).toHaveLength(0);
  });

  it('CD-005: 删除带子节点的父节点 B（B→C, B→D）→ 子树正确清理', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'ROOT', type: 'ROOT', ports: {}, children: [
          {
            id: 'A', type: 'Sequence', ports: {}, children: [
              {
                id: 'B', type: 'Fallback', ports: {}, children: [
                  { id: 'C', type: 'Action', ports: {}, children: [] },
                  { id: 'D', type: 'Action', ports: {}, children: [] }
                ]
              }
            ]
          }
        ]
      }
    };

    const { nodes, edges } = treeToFlow(initialTree);

    const deleteIds = new Set(['B']);
    const nodesAfter = nodes.filter((n: Node) => !deleteIds.has(n.id));
    const edgesAfter = edges.filter((e: Edge) => !deleteIds.has(e.source) && !deleteIds.has(e.target));

    const resultTree = flowToTree('Tree', nodesAfter, edgesAfter);

    function nodeIds(node: { id: string; children: unknown[] }): string[] {
      const ids = [node.id];
      node.children.forEach((c) => ids.push(...nodeIds(c as { id: string; children: unknown[] })));
      return ids;
    }
    const allIds = nodeIds(resultTree.root);

    expect(allIds).toEqual(['ROOT', 'A']);
    expect(resultTree.root.children[0].children).toHaveLength(0);
  });

  it('CD-006: 禁止删除 ROOT → ROOT 被保护，删除操作不触及 ROOT', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'ROOT', type: 'ROOT', ports: {}, children: [
          {
            id: 'A', type: 'Sequence', ports: {}, children: [
              { id: 'B', type: 'Action', ports: {}, children: [] }
            ]
          }
        ]
      }
    };

    const { nodes, edges } = treeToFlow(initialTree);

    // 模拟键盘 Delete 处理器的保护逻辑
    const rootIds = new Set(
      nodes.filter((n: Node) => (n.data as { isRoot?: boolean }).isRoot).map((n: Node) => n.id)
    );
    const selectedIds = new Set(['ROOT']);
    const idsToDelete = new Set([...selectedIds].filter((id) => !rootIds.has(id)));

    const nodesAfter = nodes.filter((n: Node) => !idsToDelete.has(n.id));
    const edgesAfter = edges.filter((e: Edge) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target));

    const resultTree = flowToTree('Tree', nodesAfter, edgesAfter);

    expect(resultTree.root.id).toBe('ROOT');
    expect(resultTree.root.children).toHaveLength(1);
    expect(resultTree.root.children[0].id).toBe('A');
  });

  it('CD-ADD: Delete Subtree（B→C, B→D→E）→ 子树节点和连接边全部清理', () => {
    const initialTree = {
      id: 'Tree',
      root: {
        id: 'ROOT', type: 'ROOT', ports: {}, children: [
          {
            id: 'A', type: 'Sequence', ports: {}, children: [
              {
                id: 'B', type: 'Fallback', ports: {}, children: [
                  { id: 'C', type: 'Action', ports: {}, children: [] },
                  { id: 'D', type: 'Sequence', ports: {}, children: [
                    { id: 'E', type: 'Action', ports: {}, children: [] }
                  ]}
                ]
              }
            ]
          }
        ]
      }
    };

    const { nodes, edges } = treeToFlow(initialTree);

    // 模拟 Delete Subtree：获取 B 的所有子孙节点
    const subtreeNodeIds = new Set<string>();
    subtreeNodeIds.add('B');
    getDescendantIds('B', edges).forEach((id: string) => subtreeNodeIds.add(id));

    expect(subtreeNodeIds).toEqual(new Set(['B', 'C', 'D', 'E']));

    const nodesAfter = nodes.filter((n: Node) => !subtreeNodeIds.has(n.id));
    const edgesAfter = edges.filter((e: Edge) => !subtreeNodeIds.has(e.source) && !subtreeNodeIds.has(e.target));

    const resultTree = flowToTree('Tree', nodesAfter, edgesAfter);

    function nodeIds(node: { id: string; children: unknown[] }): string[] {
      const ids = [node.id];
      node.children.forEach((c) => ids.push(...nodeIds(c as { id: string; children: unknown[] })));
      return ids;
    }
    const allIds = nodeIds(resultTree.root);

    expect(allIds).toEqual(['ROOT', 'A']);
    expect(resultTree.root.children[0].children).toHaveLength(0);
  });
});

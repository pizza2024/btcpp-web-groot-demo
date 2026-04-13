import type { BTTree, BTTreeNode, BTNodeDefinition } from '../types/bt';
import type { Node, Edge } from '@xyflow/react';
import { BUILTIN_NODES, EDITOR_ROOT_TYPE } from '../types/bt-constants';
import { CATEGORY_COLORS } from '../types/bt-constants';

let _edgeCounter = 0;

// Extended node data including childrenCount for multi-handle support
export interface BTFlowNodeData {
  label: string;
  nodeType: string;
  category: string;
  colors: { bg: string; border: string; text: string };
  ports: Record<string, string>;
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  description?: string;
  childIndex?: number;
  childrenCount: number;
  [key: string]: unknown;
}

export function treeToFlow(
  tree: BTTree,
  nodeModels: BTNodeDefinition[] = []
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  _edgeCounter = 0;

  // Pre-pass: count children for each node
  function countChildren(btNode: BTTreeNode): number {
    return btNode.children.length;
  }

  function walk(btNode: BTTreeNode, parentId?: string, childIndex?: number) {
    const builtinDef = BUILTIN_NODES.find((n) => n.type === btNode.type);
    const customDef = nodeModels.find((n) => n.type === btNode.type);
    const category = builtinDef?.category ?? customDef?.category ?? 'Action';
    const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Action'];
    const childrenCount = countChildren(btNode);

    nodes.push({
      id: btNode.id,
      type: 'btNode',
      position: { x: 0, y: 0 }, // layout will fix this
      data: {
        label: btNode.name ?? btNode.type,
        nodeType: btNode.type,
        category: btNode.type === EDITOR_ROOT_TYPE ? 'ROOT' : category,
        colors: btNode.type === EDITOR_ROOT_TYPE ? CATEGORY_COLORS['ROOT'] : colors,
        ports: btNode.ports,
        preconditions: btNode.preconditions,
        postconditions: btNode.postconditions,
        childIndex,
        childrenCount,
        isRoot: btNode.type === EDITOR_ROOT_TYPE,
      } as BTFlowNodeData,
    });

    if (parentId !== undefined) {
      edges.push({
        id: `e_${_edgeCounter++}`,
        source: parentId,
        target: btNode.id,
        type: 'btEdge',
        style: { stroke: '#6888aa', strokeWidth: 2 },
      });
    }

    btNode.children.forEach((child, idx) => {
      walk(child, btNode.id, idx);
    });
  }

  walk(tree.root);
  return { nodes, edges };
}

export function flowToTree(treeId: string, nodes: Node[], edges: Edge[]): BTTree {
  // Build adjacency: parentId -> [{childId, edgeId}]
  const children: Map<string, string[]> = new Map();
  nodes.forEach((n) => children.set(n.id, []));

  edges.forEach((e) => {
    const arr = children.get(e.source) ?? [];
    arr.push(e.target);
    children.set(e.source, arr);
  });

  // Find root node (no incoming edges)
  const hasParent = new Set(edges.map((e) => e.target));
  let rootNodes = nodes.filter((n) => !hasParent.has(n.id));
  if (rootNodes.length === 0) throw new Error('No root node found');
  // When an edge is deleted, the target can become a second "root" (no incoming edges).
  // Prefer the ROOT-type node as the actual tree root; otherwise use first found.
  if (rootNodes.length > 1) {
    const rootTypeNode = rootNodes.find((n) => (n.data as { nodeType?: string }).nodeType === EDITOR_ROOT_TYPE);
    if (rootTypeNode) rootNodes = [rootTypeNode];
    else rootNodes = [rootNodes[0]];
  }
  const rootNode = rootNodes[0];

  function buildNode(nodeId: string): BTTreeNode {
    const flowNode = nodes.find((n) => n.id === nodeId)!;
    const data = flowNode.data as {
      nodeType: string;
      label: string;
      ports?: Record<string, string>;
      preconditions?: Record<string, string>;
      postconditions?: Record<string, string>;
      description?: string;
    };
    const childIds = children.get(nodeId) ?? [];
    return {
      id: nodeId,
      type: data.nodeType,
      name: data.label !== data.nodeType ? data.label : undefined,
      ports: (data.ports as Record<string, string>) ?? {},
      preconditions: data.preconditions,
      postconditions: data.postconditions,
      description: data.description,
      children: childIds.map(buildNode),
    };
  }

  return { id: treeId, root: buildNode(rootNode.id) };
}

/**
 * Get all descendant node IDs of a given node (all nodes reachable via outgoing edges).
 * This is used for Ctrl+drag to move an entire subtree.
 */
export function getDescendantIds(nodeId: string, edges: Edge[]): string[] {
  const children: Map<string, string[]> = new Map();
  edges.forEach((e) => {
    const arr = children.get(e.source) ?? [];
    arr.push(e.target);
    children.set(e.source, arr);
  });

  const result: string[] = [];
  const queue: string[] = [...(children.get(nodeId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    const grandchildren = children.get(current) ?? [];
    queue.push(...grandchildren);
  }
  return result;
}

export function isSameTreeStructure(left: BTTree, right: BTTree): boolean {
  if (left.id !== right.id) return false;
  return isSameTreeNodeStructure(left.root, right.root);
}

function isSameTreeNodeStructure(left: BTTreeNode, right: BTTreeNode): boolean {
  if (left.id !== right.id) return false;
  if (left.type !== right.type) return false;
  if (left.name !== right.name) return false;

  const leftPortKeys = Object.keys(left.ports);
  const rightPortKeys = Object.keys(right.ports);
  if (leftPortKeys.length !== rightPortKeys.length) return false;
  for (const key of leftPortKeys) {
    if (left.ports[key] !== right.ports[key]) return false;
  }

  if (left.children.length !== right.children.length) return false;
  return left.children.every((child, index) => isSameTreeNodeStructure(child, right.children[index]));
}

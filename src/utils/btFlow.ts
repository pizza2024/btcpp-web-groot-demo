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
  cdata?: string;
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

  function walk(btNode: BTTreeNode, childIndex?: number) {
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
        cdata: btNode.cdata,
      } as BTFlowNodeData,
    });

    btNode.children.forEach((child, idx) => {
      walk(child, idx);
      edges.push({
        id: `e_${_edgeCounter++}`,
        source: btNode.id,
        target: child.id,
        type: 'btEdge',
        style: { stroke: '#6888aa', strokeWidth: 2 },
      });
    });
  }

  walk(tree.root);
  return { nodes, edges };
}

export function flowToTree(treeId: string, nodes: Node[], edges: Edge[]): BTTree {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  type ChildEdge = {
    targetId: string;
    sourceHandleOrder?: number;
    originalIndex: number;
  };

  // Build adjacency and preserve sibling order using explicit handle indices first,
  // then fall back to canvas left-to-right layout for legacy edges.
  const children: Map<string, ChildEdge[]> = new Map();
  nodes.forEach((node) => children.set(node.id, []));

  edges.forEach((edge, index) => {
    const arr = children.get(edge.source) ?? [];
    arr.push({
      targetId: edge.target,
      sourceHandleOrder: parseHandleOrder(edge.sourceHandle),
      originalIndex: index,
    });
    children.set(edge.source, arr);
  });

  children.forEach((childEdges) => {
    childEdges.sort((left, right) => {
      if (left.sourceHandleOrder !== undefined && right.sourceHandleOrder !== undefined && left.sourceHandleOrder !== right.sourceHandleOrder) {
        return left.sourceHandleOrder - right.sourceHandleOrder;
      }
      if (left.sourceHandleOrder !== undefined) return -1;
      if (right.sourceHandleOrder !== undefined) return 1;

      const leftNode = nodeById.get(left.targetId);
      const rightNode = nodeById.get(right.targetId);
      const deltaX = (leftNode?.position.x ?? 0) - (rightNode?.position.x ?? 0);
      if (deltaX !== 0) return deltaX;

      const deltaY = (leftNode?.position.y ?? 0) - (rightNode?.position.y ?? 0);
      if (deltaY !== 0) return deltaY;

      return left.originalIndex - right.originalIndex;
    });
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
    const flowNode = nodeById.get(nodeId)!;
    const data = flowNode.data as {
      nodeType: string;
      label: string;
      ports?: Record<string, string>;
      preconditions?: Record<string, string>;
      postconditions?: Record<string, string>;
      description?: string;
      cdata?: string;
    };
    const childIds = (children.get(nodeId) ?? []).map((child) => child.targetId);
    return {
      id: nodeId,
      type: data.nodeType,
      name: data.label !== data.nodeType ? data.label : undefined,
      ports: (data.ports as Record<string, string>) ?? {},
      preconditions: data.preconditions,
      postconditions: data.postconditions,
      description: data.description,
      cdata: data.cdata,
      children: childIds.map(buildNode),
    };
  }

  return { id: treeId, root: buildNode(rootNode.id) };
}

function parseHandleOrder(handle?: string | null): number | undefined {
  if (!handle) return undefined;
  const match = handle.match(/(\d+)$/);
  if (!match) return undefined;

  const order = Number.parseInt(match[1], 10);
  return Number.isNaN(order) ? undefined : order;
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

export function getAttachedNodeIds(nodes: Node[], edges: Edge[]): Set<string> {
  const rootNode = nodes.find((node) => {
    const data = node.data as { nodeType?: string; isRoot?: boolean };
    return data.isRoot === true || data.nodeType === EDITOR_ROOT_TYPE;
  });

  if (!rootNode) {
    return new Set(nodes.map((node) => node.id));
  }

  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  });

  const visited = new Set<string>();
  const queue: string[] = [rootNode.id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const children = adjacency.get(current) ?? [];
    children.forEach((child) => {
      if (!visited.has(child)) {
        queue.push(child);
      }
    });
  }

  return visited;
}

export function getDetachedNodeIds(nodes: Node[], edges: Edge[]): Set<string> {
  const attachedIds = getAttachedNodeIds(nodes, edges);
  return new Set(nodes.filter((node) => !attachedIds.has(node.id)).map((node) => node.id));
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

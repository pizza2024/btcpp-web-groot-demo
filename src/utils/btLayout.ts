import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;
const NODE_GAP_X = 40;
const NODE_GAP_Y = 60;

function getChildIndex(node: Node): number | undefined {
  const data = node.data as { childIndex?: unknown } | undefined;
  return typeof data?.childIndex === 'number' ? data.childIndex : undefined;
}

function buildChildIdsByParent(edges: Edge[]): Map<string, string[]> {
  const childIdsByParent = new Map<string, string[]>();
  edges.forEach((edge) => {
    const childIds = childIdsByParent.get(edge.source) ?? [];
    childIds.push(edge.target);
    childIdsByParent.set(edge.source, childIds);
  });
  return childIdsByParent;
}

function sortChildIdsByNodeOrder(childIds: string[], nodeById: Map<string, Node>): string[] {
  return [...childIds].sort((leftId, rightId) => {
    const left = nodeById.get(leftId);
    const right = nodeById.get(rightId);

    const leftIndex = left ? getChildIndex(left) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const rightIndex = right ? getChildIndex(right) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;

    return leftId.localeCompare(rightId);
  });
}

function canUseOrderedTreeLayout(nodes: Node[], edges: Edge[]): boolean {
  if (nodes.length === 0) return true;

  const incomingCounts = new Map<string, number>();
  nodes.forEach((node) => incomingCounts.set(node.id, 0));

  for (const edge of edges) {
    if (!incomingCounts.has(edge.source) || !incomingCounts.has(edge.target)) {
      return false;
    }
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
    if ((incomingCounts.get(edge.target) ?? 0) > 1) {
      return false;
    }
  }

  return true;
}

function orderedTreeLayout(nodes: Node[], edges: Edge[]): Node[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childIdsByParent = buildChildIdsByParent(edges);
  const incomingCounts = new Map<string, number>();
  nodes.forEach((node) => incomingCounts.set(node.id, 0));
  edges.forEach((edge) => {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });

  const sortedChildIdsByParent = new Map<string, string[]>();
  childIdsByParent.forEach((childIds, parentId) => {
    sortedChildIdsByParent.set(parentId, sortChildIdsByNodeOrder(childIds, nodeById));
  });

  const subtreeWidth = new Map<string, number>();
  const visiting = new Set<string>();

  const measure = (nodeId: string): number => {
    if (subtreeWidth.has(nodeId)) return subtreeWidth.get(nodeId)!;
    if (visiting.has(nodeId)) {
      // Defensive fallback for malformed cyclic graphs.
      return NODE_WIDTH;
    }

    visiting.add(nodeId);
    const childIds = sortedChildIdsByParent.get(nodeId) ?? [];
    if (childIds.length === 0) {
      subtreeWidth.set(nodeId, NODE_WIDTH);
      visiting.delete(nodeId);
      return NODE_WIDTH;
    }

    const totalChildrenWidth = childIds.reduce((sum, childId) => sum + measure(childId), 0);
    const childrenSpan = totalChildrenWidth + NODE_GAP_X * (childIds.length - 1);
    const width = Math.max(NODE_WIDTH, childrenSpan);
    subtreeWidth.set(nodeId, width);
    visiting.delete(nodeId);
    return width;
  };

  const roots = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.id.localeCompare(right.id));

  roots.forEach((root) => {
    measure(root.id);
  });

  const placed = new Set<string>();
  const positions = new Map<string, { x: number; y: number }>();

  const place = (nodeId: string, leftBound: number, depth: number): void => {
    if (placed.has(nodeId)) return;

    const width = subtreeWidth.get(nodeId) ?? NODE_WIDTH;
    const centerX = leftBound + width / 2;
    positions.set(nodeId, {
      x: centerX - NODE_WIDTH / 2,
      y: depth * (NODE_HEIGHT + NODE_GAP_Y),
    });
    placed.add(nodeId);

    const childIds = sortedChildIdsByParent.get(nodeId) ?? [];
    if (childIds.length === 0) return;

    const totalChildrenWidth = childIds.reduce((sum, childId) => sum + (subtreeWidth.get(childId) ?? NODE_WIDTH), 0);
    const childrenSpan = totalChildrenWidth + NODE_GAP_X * (childIds.length - 1);
    let childLeft = leftBound + (width - childrenSpan) / 2;

    childIds.forEach((childId) => {
      const childWidth = subtreeWidth.get(childId) ?? NODE_WIDTH;
      place(childId, childLeft, depth + 1);
      childLeft += childWidth + NODE_GAP_X;
    });
  };

  let nextRootLeft = 0;
  roots.forEach((root) => {
    const rootWidth = subtreeWidth.get(root.id) ?? NODE_WIDTH;
    place(root.id, nextRootLeft, 0);
    nextRootLeft += rootWidth + NODE_GAP_X;
  });

  // Any disconnected/cyclic leftovers: place after roots in deterministic order.
  const leftovers = nodes
    .filter((node) => !placed.has(node.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  leftovers.forEach((node, index) => {
    positions.set(node.id, {
      x: nextRootLeft + index * (NODE_WIDTH + NODE_GAP_X),
      y: 0,
    });
  });

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}

function dagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: NODE_GAP_Y, nodesep: NODE_GAP_X });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function enforceSiblingOrder(nodes: Node[], childIdsByParent: Map<string, string[]>): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  childIdsByParent.forEach((childIds) => {
    if (childIds.length < 2) return;

    const childNodes = childIds
      .map((id) => nodeById.get(id))
      .filter((node): node is Node => Boolean(node));

    if (childNodes.length < 2) return;

    const desiredOrder = [...childNodes].sort((left, right) => {
      const leftIndex = getChildIndex(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = getChildIndex(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return left.id.localeCompare(right.id);
    });

    const xSlots = [...childNodes]
      .map((node) => node.position.x)
      .sort((left, right) => left - right);

    desiredOrder.forEach((node, index) => {
      node.position = {
        ...node.position,
        x: xSlots[index],
      };
    });
  });
}

function alignSingleChildChains(nodes: Node[], edges: Edge[], childIdsByParent: Map<string, string[]>): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incomingCounts = new Map<string, number>();

  edges.forEach((edge) => {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
    if (!incomingCounts.has(edge.source)) {
      incomingCounts.set(edge.source, incomingCounts.get(edge.source) ?? 0);
    }
  });

  nodes.forEach((node) => {
    if (!incomingCounts.has(node.id)) {
      incomingCounts.set(node.id, 0);
    }
  });

  const roots = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.position.y - right.position.y || left.id.localeCompare(right.id));

  const queue = [...roots];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const parent = queue.shift()!;
    if (visited.has(parent.id)) continue;
    visited.add(parent.id);

    const childIds = childIdsByParent.get(parent.id) ?? [];

    if (childIds.length === 1) {
      const onlyChild = nodeById.get(childIds[0]);
      if (onlyChild && (incomingCounts.get(onlyChild.id) ?? 0) === 1) {
        onlyChild.position = {
          ...onlyChild.position,
          x: parent.position.x,
        };
      }
    }

    childIds
      .map((id) => nodeById.get(id))
      .filter((node): node is Node => Boolean(node))
      .sort((left, right) => left.position.y - right.position.y || left.id.localeCompare(right.id))
      .forEach((child) => queue.push(child));
  }
}

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const laidOutNodes = canUseOrderedTreeLayout(nodes, edges)
    ? orderedTreeLayout(nodes, edges)
    : dagreLayout(nodes, edges);

  const childIdsByParent = buildChildIdsByParent(edges);
  enforceSiblingOrder(laidOutNodes, childIdsByParent);
  alignSingleChildChains(laidOutNodes, edges, childIdsByParent);

  return laidOutNodes;
}

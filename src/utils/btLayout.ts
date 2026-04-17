import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;
const NODE_GAP_X = 24;
const NODE_GAP_Y = 64;
const SUBTREE_COMPACT_GAP_X = 18;

function getNodeWidth(node: Node): number {
  const measuredWidth = (node as Node & { measured?: { width?: number } }).measured?.width;
  if (typeof measuredWidth === 'number' && Number.isFinite(measuredWidth) && measuredWidth > 0) {
    return measuredWidth;
  }

  return typeof node.width === 'number' && Number.isFinite(node.width) && node.width > 0
    ? node.width
    : NODE_WIDTH;
}

function getNodeHeight(node: Node): number {
  const measuredHeight = (node as Node & { measured?: { height?: number } }).measured?.height;
  if (typeof measuredHeight === 'number' && Number.isFinite(measuredHeight) && measuredHeight > 0) {
    return measuredHeight;
  }

  return typeof node.height === 'number' && Number.isFinite(node.height) && node.height > 0
    ? node.height
    : NODE_HEIGHT;
}

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

  const depthById = new Map<string, number>();
  const depthQueue = roots.map((root) => ({ id: root.id, depth: 0 }));
  while (depthQueue.length > 0) {
    const current = depthQueue.shift()!;
    if (depthById.has(current.id)) continue;
    depthById.set(current.id, current.depth);

    const childIds = sortedChildIdsByParent.get(current.id) ?? [];
    childIds.forEach((childId) => {
      depthQueue.push({ id: childId, depth: current.depth + 1 });
    });
  }

  nodes.forEach((node) => {
    if (!depthById.has(node.id)) {
      depthById.set(node.id, 0);
    }
  });

  const maxHeightByDepth = new Map<number, number>();
  nodes.forEach((node) => {
    const depth = depthById.get(node.id) ?? 0;
    const height = getNodeHeight(node);
    maxHeightByDepth.set(depth, Math.max(maxHeightByDepth.get(depth) ?? 0, height));
  });

  const depthOffsets = new Map<number, number>();
  const sortedDepths = [...maxHeightByDepth.keys()].sort((left, right) => left - right);
  let currentYOffset = 0;
  sortedDepths.forEach((depth) => {
    depthOffsets.set(depth, currentYOffset);
    currentYOffset += (maxHeightByDepth.get(depth) ?? NODE_HEIGHT) + NODE_GAP_Y;
  });

  roots.forEach((root) => {
    measure(root.id);
  });

  const placed = new Set<string>();
  const positions = new Map<string, { x: number; y: number }>();

  const place = (nodeId: string, leftBound: number, depth: number): void => {
    if (placed.has(nodeId)) return;

    const width = subtreeWidth.get(nodeId) ?? NODE_WIDTH;
    const centerX = leftBound + width / 2;
    const node = nodeById.get(nodeId);
    const nodeWidth = node ? getNodeWidth(node) : NODE_WIDTH;
    positions.set(nodeId, {
      x: centerX - nodeWidth / 2,
      y: depthOffsets.get(depth) ?? depth * (NODE_HEIGHT + NODE_GAP_Y),
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
  let nextLeftoverLeft = nextRootLeft;
  leftovers.forEach((node) => {
    const width = getNodeWidth(node);
    positions.set(node.id, {
      x: nextLeftoverLeft,
      y: 0,
    });
    nextLeftoverLeft += width + NODE_GAP_X;
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
    g.setNode(n.id, { width: getNodeWidth(n), height: getNodeHeight(n) });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const width = getNodeWidth(n);
    const height = getNodeHeight(n);
    return {
      ...n,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    };
  });
}

function buildSortedChildIdsByParent(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childIdsByParent = buildChildIdsByParent(edges);
  const sortedChildIdsByParent = new Map<string, string[]>();
  childIdsByParent.forEach((childIds, parentId) => {
    sortedChildIdsByParent.set(parentId, sortChildIdsByNodeOrder(childIds, nodeById));
  });
  return sortedChildIdsByParent;
}

function buildDepthById(nodes: Node[], edges: Edge[], childIdsByParent: Map<string, string[]>): Map<string, number> {
  const incomingCounts = new Map<string, number>();
  nodes.forEach((node) => incomingCounts.set(node.id, 0));
  edges.forEach((edge) => {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });

  const roots = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.id.localeCompare(right.id));

  const depthById = new Map<string, number>();
  const queue = roots.map((root) => ({ id: root.id, depth: 0 }));
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (depthById.has(current.id)) continue;
    depthById.set(current.id, current.depth);

    const childIds = childIdsByParent.get(current.id) ?? [];
    childIds.forEach((childId) => {
      queue.push({ id: childId, depth: current.depth + 1 });
    });
  }

  nodes.forEach((node) => {
    if (!depthById.has(node.id)) {
      depthById.set(node.id, 0);
    }
  });

  return depthById;
}

function collectSubtreeNodeIds(rootId: string, childIdsByParent: Map<string, string[]>): string[] {
  const ids: string[] = [];
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    ids.push(currentId);
    const childIds = childIdsByParent.get(currentId) ?? [];
    for (let index = childIds.length - 1; index >= 0; index -= 1) {
      stack.push(childIds[index]);
    }
  }

  return ids;
}

function evenlyDistributeChildSubtrees(nodes: Node[], edges: Edge[]): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childIdsByParent = buildSortedChildIdsByParent(nodes, edges);
  const depthById = buildDepthById(nodes, edges, childIdsByParent);

  const shiftSubtree = (rootId: string, deltaX: number): void => {
    if (deltaX === 0) return;

    collectSubtreeNodeIds(rootId, childIdsByParent).forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return;
      node.position = {
        ...node.position,
        x: node.position.x + deltaX,
      };
    });
  };

  const getSubtreeExtents = (rootId: string): { left: number; right: number } => {
    const rootNode = nodeById.get(rootId);
    if (!rootNode) return { left: NODE_WIDTH / 2, right: NODE_WIDTH / 2 };

    const rootWidth = getNodeWidth(rootNode);
    const rootCenter = rootNode.position.x + rootWidth / 2;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;

    collectSubtreeNodeIds(rootId, childIdsByParent).forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return;
      const width = getNodeWidth(node);
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + width);
    });

    return {
      left: rootCenter - minX,
      right: maxX - rootCenter,
    };
  };

  const parents = [...nodes].sort((left, right) => {
    const depthDelta = (depthById.get(right.id) ?? 0) - (depthById.get(left.id) ?? 0);
    if (depthDelta !== 0) return depthDelta;
    return left.id.localeCompare(right.id);
  });

  parents.forEach((parent) => {
    const childIds = childIdsByParent.get(parent.id) ?? [];
    if (childIds.length < 3) return;

    const childNodes = childIds
      .map((childId) => nodeById.get(childId))
      .filter((node): node is Node => Boolean(node));
    if (childNodes.length < 2) return;

    const extents = childIds.map((childId) => getSubtreeExtents(childId));
    const parentWidth = getNodeWidth(parent);
    const desiredStep = parentWidth + SUBTREE_COMPACT_GAP_X;
    const pairwiseGaps: number[] = [];
    for (let index = 0; index < extents.length - 1; index += 1) {
      const minGap = extents[index].right + extents[index + 1].left + SUBTREE_COMPACT_GAP_X;
      pairwiseGaps.push(Math.max(desiredStep, minGap));
    }

    const totalSpan = pairwiseGaps.reduce((sum, gap) => sum + gap, 0);

    const parentCenter = parent.position.x + parentWidth / 2;
    const firstCenter = parentCenter - totalSpan / 2;

    let nextCenter = firstCenter;
    childIds.forEach((childId, index) => {
      const childNode = nodeById.get(childId);
      if (!childNode) return;
      const childWidth = getNodeWidth(childNode);
      const currentCenter = childNode.position.x + childWidth / 2;
      const targetCenter = nextCenter;
      shiftSubtree(childId, targetCenter - currentCenter);

      if (index < pairwiseGaps.length) {
        nextCenter += pairwiseGaps[index];
      }
    });
  });
}

function compactSiblingSubtrees(nodes: Node[], edges: Edge[]): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sortedChildIdsByParent = buildSortedChildIdsByParent(nodes, edges);
  const depthById = buildDepthById(nodes, edges, sortedChildIdsByParent);
  const incomingCounts = new Map<string, number>();
  nodes.forEach((node) => incomingCounts.set(node.id, 0));
  edges.forEach((edge) => {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });
  const roots = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.id.localeCompare(right.id));

  const computeContours = (rootId: string): { left: Map<number, number>; right: Map<number, number> } => {
    const left = new Map<number, number>();
    const right = new Map<number, number>();

    collectSubtreeNodeIds(rootId, sortedChildIdsByParent).forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return;

      const depth = depthById.get(nodeId) ?? 0;
      const width = getNodeWidth(node);
      const leftX = node.position.x;
      const rightX = node.position.x + width;

      left.set(depth, Math.min(left.get(depth) ?? Number.POSITIVE_INFINITY, leftX));
      right.set(depth, Math.max(right.get(depth) ?? Number.NEGATIVE_INFINITY, rightX));
    });

    return { left, right };
  };

  const shiftSubtree = (rootId: string, deltaX: number): void => {
    if (deltaX === 0) return;
    collectSubtreeNodeIds(rootId, sortedChildIdsByParent).forEach((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return;
      node.position = {
        ...node.position,
        x: node.position.x + deltaX,
      };
    });
  };

  const compactChildren = (parentId: string): void => {
    const childIds = sortedChildIdsByParent.get(parentId) ?? [];

    if (childIds.length >= 2) {
      const packedRight = new Map<number, number>();

      childIds.forEach((childId, index) => {
        let contours = computeContours(childId);

        if (index > 0) {
          let minDelta = Number.NEGATIVE_INFINITY;
          let hasConstraint = false;

          contours.left.forEach((leftX, depth) => {
            const rightX = packedRight.get(depth);
            if (rightX === undefined) return;
            hasConstraint = true;
            const requiredDelta = rightX + SUBTREE_COMPACT_GAP_X - leftX;
            if (requiredDelta > minDelta) {
              minDelta = requiredDelta;
            }
          });

          const shiftLeftDelta = hasConstraint ? Math.min(0, minDelta) : 0;
          if (shiftLeftDelta !== 0) {
            shiftSubtree(childId, shiftLeftDelta);
            contours = computeContours(childId);
          }
        }

        contours.right.forEach((rightX, depth) => {
          packedRight.set(depth, Math.max(packedRight.get(depth) ?? Number.NEGATIVE_INFINITY, rightX));
        });
      });
    }

    childIds.forEach((childId) => {
      compactChildren(childId);
    });
  };

  roots.forEach((root) => compactChildren(root.id));
}

function centerParentsOverChildren(nodes: Node[], edges: Edge[]): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childIdsByParent = buildChildIdsByParent(edges);
  const incomingCounts = new Map<string, number>();
  nodes.forEach((node) => incomingCounts.set(node.id, 0));
  edges.forEach((edge) => {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });

  const depthById = new Map<string, number>();
  const roots = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((left, right) => left.id.localeCompare(right.id));
  const queue = roots.map((root) => ({ id: root.id, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const existingDepth = depthById.get(current.id);
    if (existingDepth !== undefined && existingDepth <= current.depth) continue;
    depthById.set(current.id, current.depth);

    const childIds = childIdsByParent.get(current.id) ?? [];
    childIds.forEach((childId) => {
      queue.push({ id: childId, depth: current.depth + 1 });
    });
  }

  const nodesByDepth = [...nodes].sort((left, right) => {
    const depthDelta = (depthById.get(right.id) ?? 0) - (depthById.get(left.id) ?? 0);
    if (depthDelta !== 0) return depthDelta;
    return left.id.localeCompare(right.id);
  });

  nodesByDepth.forEach((node) => {
    const childIds = childIdsByParent.get(node.id) ?? [];
    if (childIds.length < 2) return;

    const childBounds = childIds
      .map((childId) => nodeById.get(childId))
      .filter((child): child is Node => Boolean(child))
      .map((child) => {
        const width = getNodeWidth(child);
        return { left: child.position.x, right: child.position.x + width };
      });

    if (childBounds.length < 2) return;

    const left = Math.min(...childBounds.map((bound) => bound.left));
    const right = Math.max(...childBounds.map((bound) => bound.right));
    const desiredCenterX = (left + right) / 2;
    const nodeWidth = getNodeWidth(node);

    node.position = {
      ...node.position,
      x: desiredCenterX - nodeWidth / 2,
    };
  });
}

function normalizeLayoutCenter(nodes: Node[], edges: Edge[]): void {
  if (nodes.length === 0) return;

  const incomingCounts = new Map<string, number>();
  nodes.forEach((node) => incomingCounts.set(node.id, 0));
  edges.forEach((edge) => {
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });

  const roots = nodes.filter((node) => (incomingCounts.get(node.id) ?? 0) === 0);
  if (roots.length === 0) return;

  const rootCenters = roots.map((root) => root.position.x + getNodeWidth(root) / 2);
  const desiredCenter = rootCenters.reduce((sum, center) => sum + center, 0) / rootCenters.length;

  nodes.forEach((node) => {
    node.position = {
      ...node.position,
      x: node.position.x - desiredCenter,
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
  const useOrderedTreeLayout = canUseOrderedTreeLayout(nodes, edges);
  const laidOutNodes = useOrderedTreeLayout
    ? orderedTreeLayout(nodes, edges)
    : dagreLayout(nodes, edges);

  if (useOrderedTreeLayout) {
    compactSiblingSubtrees(laidOutNodes, edges);
    evenlyDistributeChildSubtrees(laidOutNodes, edges);
    centerParentsOverChildren(laidOutNodes, edges);
    normalizeLayoutCenter(laidOutNodes, edges);
  }

  const childIdsByParent = buildChildIdsByParent(edges);
  enforceSiblingOrder(laidOutNodes, childIdsByParent);
  alignSingleChildChains(laidOutNodes, edges, childIdsByParent);

  return laidOutNodes;
}

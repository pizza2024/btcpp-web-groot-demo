import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

function getChildIndex(node: Node): number | undefined {
  const data = node.data as { childIndex?: unknown } | undefined;
  return typeof data?.childIndex === 'number' ? data.childIndex : undefined;
}

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 30 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  const laidOutNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  const nodeById = new Map(laidOutNodes.map((node) => [node.id, node]));
  const childIdsByParent = new Map<string, string[]>();
  edges.forEach((edge) => {
    const childIds = childIdsByParent.get(edge.source) ?? [];
    childIds.push(edge.target);
    childIdsByParent.set(edge.source, childIds);
  });

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

  return laidOutNodes;
}

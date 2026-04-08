import type { BTTree, BTTreeNode, BTNodeDefinition } from '../types/bt';
import type { Node, Edge } from '@xyflow/react';
import { BUILTIN_NODES } from '../types/bt-constants';
import { CATEGORY_COLORS } from '../types/bt-constants';

let _edgeCounter = 0;

export function treeToFlow(
  tree: BTTree,
  nodeModels: BTNodeDefinition[] = []
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  _edgeCounter = 0;

  function walk(btNode: BTTreeNode, parentId?: string, childIndex?: number) {
    const builtinDef = BUILTIN_NODES.find((n) => n.type === btNode.type);
    const customDef = nodeModels.find((n) => n.type === btNode.type);
    const category = builtinDef?.category ?? customDef?.category ?? 'Leaf';
    const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Leaf'];

    nodes.push({
      id: btNode.id,
      type: 'btNode',
      position: { x: 0, y: 0 }, // layout will fix this
      data: {
        label: btNode.name ?? btNode.type,
        nodeType: btNode.type,
        category,
        colors,
        ports: btNode.ports,
        childIndex,
      },
    });

    if (parentId !== undefined) {
      edges.push({
        id: `e_${_edgeCounter++}`,
        source: parentId,
        target: btNode.id,
        type: 'smoothstep',
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
  const rootNodes = nodes.filter((n) => !hasParent.has(n.id));
  if (rootNodes.length === 0) throw new Error('No root node found');
  const rootNode = rootNodes[0];

  function buildNode(nodeId: string): BTTreeNode {
    const flowNode = nodes.find((n) => n.id === nodeId)!;
    const data = flowNode.data as {
      nodeType: string;
      label: string;
      ports?: Record<string, string>;
    };
    const childIds = children.get(nodeId) ?? [];
    return {
      id: nodeId,
      type: data.nodeType,
      name: data.label !== data.nodeType ? data.label : undefined,
      ports: (data.ports as Record<string, string>) ?? {},
      children: childIds.map(buildNode),
    };
  }

  return { id: treeId, root: buildNode(rootNode.id) };
}

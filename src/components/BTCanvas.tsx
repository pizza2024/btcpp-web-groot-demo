import React, { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import type {
  Connection,
  Node,
  Edge,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useBTStore } from '../store/btStore';
import { treeToFlow, flowToTree, isSameTreeStructure } from '../utils/btFlow';
import { autoLayout } from '../utils/btLayout';
import BTFlowNode from './nodes/BTFlowNode';
import BTFlowEdge from './edges/BTFlowEdge';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeDefinition, BTProject } from '../types/bt';

const nodeTypes = { btNode: BTFlowNode };
const edgeTypes = { btEdge: BTFlowEdge };

function buildFlowNodes(
  treeId: string,
  project: BTProject,
  debugStatuses: Map<string, import('../types/bt').NodeStatus>
): { nodes: Node[]; edges: Edge[] } {
  const tree = project.trees.find((t) => t.id === treeId);
  if (!tree) return { nodes: [], edges: [] };
  let { nodes, edges } = treeToFlow(tree, project.nodeModels);
  nodes = autoLayout(nodes, edges);
  // Inject debug statuses
  nodes = nodes.map((n) => ({
    ...n,
    data: { ...n.data, status: debugStatuses.get(n.id) ?? 'IDLE' },
  }));
  return { nodes, edges };
}

const BTCanvas: React.FC = () => {
  const {
    project,
    activeTreeId,
    selectedNodeId,
    selectNode,
    debugState,
    addNodeModel,
  } = useBTStore();

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);

  // Track if we should force layout (tree switch or initial load)
  const forceLayoutRef = useRef(true);
  // Track the last tree we synced from, to detect real project changes
  const lastSyncedTreeRef = useRef<string | null>(null);

  const initial = useMemo(
    () => buildFlowNodes(activeTreeId, project, debugState.nodeStatuses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTreeId, project, debugState.nodeStatuses]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
    setSelectedEdgeId((prev) => (prev === edgeId ? null : prev));
  }, [setEdges]);

  // Sync: responds to tree switch and external project changes (like XML load)
  // NOT triggered by our own saveToStore (we use forceLayoutRef for that)
  React.useEffect(() => {
    // Force layout when switching trees or first load
    const shouldForceLayout = forceLayoutRef.current || lastSyncedTreeRef.current !== activeTreeId;

    if (shouldForceLayout) {
      // Full rebuild with autoLayout for tree switch or initial load
      const { nodes: n, edges: e } = buildFlowNodes(activeTreeId, project, debugState.nodeStatuses);
      setNodes(n);
      setEdges(withSelectedEdge(e, selectedEdgeId, deleteEdge));
      lastSyncedTreeRef.current = activeTreeId;
      forceLayoutRef.current = false;
    } else {
      // Incremental update: only sync structure from project, preserve existing positions
      const tree = project.trees.find((t) => t.id === activeTreeId);
      if (!tree) return;
      const { nodes: newNodes } = treeToFlow(tree, project.nodeModels);

      // Merge: keep existing positions from local nodes state
      setNodes((prevNodes) => {
        const existingPositions = new Map(prevNodes.map((n) => [n.id, n.position]));
        const merged = newNodes.map((n) => ({
          ...n,
          position: existingPositions.get(n.id) ?? n.position,
          selected: n.id === selectedNodeId,
          data: { ...n.data, status: debugState.nodeStatuses.get(n.id) ?? 'IDLE' },
        }));
        return merged;
      });
      setEdges((prevEdges) => withSelectedEdge(prevEdges, selectedEdgeId, deleteEdge));
    }
  }, [activeTreeId, debugState.nodeStatuses, selectedEdgeId, deleteEdge]);

  // Highlight selected node
  React.useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setSelectedEdgeId(null);
      setEdges((eds) => withSelectedEdge(
        addEdge({ ...params, type: 'btEdge', style: { stroke: '#6888aa', strokeWidth: 2 } }, eds),
        null,
        deleteEdge
      ));
    },
    [deleteEdge, setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedEdgeId(null);
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    selectNode(null);
  }, [selectNode]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      selectNode(null);
      setSelectedEdgeId(edge.id);
    },
    [selectNode]
  );

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      deleteEdge(edge.id);
    },
    [deleteEdge]
  );

  // Save tree back to store when nodes/edges change (debounced)
  // This does NOT trigger the sync effect - they're decoupled
  const saveTimerRef = useRef<number | null>(null);
  const saveToStore = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const tree = flowToTree(activeTreeId, nodes, edges);
        const { project: p } = useBTStore.getState();
        const currentTree = p.trees.find((t) => t.id === activeTreeId);
        if (currentTree && isSameTreeStructure(currentTree, tree)) return;
        const trees = p.trees.map((t) => (t.id === activeTreeId ? tree : t));
        useBTStore.setState({ project: { ...p, trees } });
      } catch {
        // ignore intermediate invalid states
      }
    }, 500);
  }, [activeTreeId, nodes, edges]);

  React.useEffect(() => {
    saveToStore();
  }, [nodes, edges, saveToStore]);

  // Handle node label changes from inline editing
  React.useEffect(() => {
    const handleLabelChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string; newLabel: string }>;
      const { nodeId, newLabel } = customEvent.detail;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: { ...n.data, label: newLabel },
            };
          }
          return n;
        })
      );
    };

    window.addEventListener('bt-node-label-change', handleLabelChange);
    return () => window.removeEventListener('bt-node-label-change', handleLabelChange);
  }, [setNodes]);

  React.useEffect(() => {
    setEdges((prev) => withSelectedEdge(prev, selectedEdgeId, deleteEdge));
  }, [selectedEdgeId, deleteEdge, setEdges]);

  React.useEffect(() => {
    if (!selectedEdgeId) return;
    if (edges.some((edge) => edge.id === selectedEdgeId)) return;
    setSelectedEdgeId(null);
  }, [edges, selectedEdgeId]);

  React.useEffect(() => {
    if (!selectedEdgeId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      event.preventDefault();
      deleteEdge(selectedEdgeId);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteEdge, selectedEdgeId]);

  // Drag-over handler for dropping from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/btnode-type');
      if (!nodeType || !rfInstanceRef.current) return;

      const position = rfInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const def: BTNodeDefinition | undefined = project.nodeModels.find((m) => m.type === nodeType)
        ?? BUILTIN_NODES.find((m) => m.type === nodeType);
      const category = def?.category ?? 'Leaf';
      const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Leaf'];

      const newNode: Node = {
        id: `n_${Math.random().toString(36).slice(2, 9)}`,
        type: 'btNode',
        position,
        data: {
          label: nodeType,
          nodeType,
          category,
          colors,
          ports: {},
          childrenCount: 0,
        },
      };

      // If it's a custom leaf node not yet in node models, auto-add
      if (!project.nodeModels.find((m) => m.type === nodeType)) {
        addNodeModel({ type: nodeType, category });
      }

      setNodes((nds) => [...nds, newNode]);
      setSelectedEdgeId(null);
    },
    [project.nodeModels, addNodeModel, setNodes]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(instance) => { rfInstanceRef.current = instance; }}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{ type: 'btEdge', style: { stroke: '#6888aa', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} color="#334" gap={20} size={1} />
        <Controls style={{ background: '#1e2235', border: '1px solid #334' }} />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as { colors?: { bg: string } };
            return d.colors?.bg ?? '#333';
          }}
          style={{ background: '#1a1a2e', border: '1px solid #334' }}
        />
      </ReactFlow>
    </div>
  );
};

export default BTCanvas;

function withSelectedEdge(
  edges: Edge[],
  selectedEdgeId: string | null,
  deleteEdge: (edgeId: string) => void
): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    type: 'btEdge',
    selected: edge.id === selectedEdgeId,
    style: {
      stroke: edge.id === selectedEdgeId ? '#c8e0ff' : '#6888aa',
      strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
    },
    data: {
      onDelete: deleteEdge,
    },
  }));
}

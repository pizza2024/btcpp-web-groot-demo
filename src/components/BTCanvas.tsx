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
import { treeToFlow, flowToTree } from '../utils/btFlow';
import { autoLayout } from '../utils/btLayout';
import BTFlowNode from './nodes/BTFlowNode';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeDefinition } from '../types/bt';

const nodeTypes = { btNode: BTFlowNode };

function buildFlowNodes(
  treeId: string,
  project: import('../types/bt').BTProject,
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

  const initial = useMemo(
    () => buildFlowNodes(activeTreeId, project, debugState.nodeStatuses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTreeId, project, debugState.nodeStatuses]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  // Sync when project / active tree / debug changes
  React.useEffect(() => {
    const { nodes: n, edges: e } = buildFlowNodes(activeTreeId, project, debugState.nodeStatuses);
    setNodes(n);
    setEdges(e);
  }, [activeTreeId, project, debugState.nodeStatuses, setNodes, setEdges]);

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
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', style: { stroke: '#6888aa', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Save tree back to store when nodes/edges change (debounced)
  const saveTimerRef = useRef<number | null>(null);
  const saveToStore = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const tree = flowToTree(activeTreeId, nodes, edges);
        const { project: p } = useBTStore.getState();
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
        },
      };

      // If it's a custom leaf node not yet in node models, auto-add
      if (!project.nodeModels.find((m) => m.type === nodeType)) {
        addNodeModel({ type: nodeType, category });
      }

      setNodes((nds) => [...nds, newNode]);
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
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        onInit={(instance) => { rfInstanceRef.current = instance; }}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#6888aa', strokeWidth: 2 } }}
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

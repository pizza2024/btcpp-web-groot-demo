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
import type { Connection, Node, Edge, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useBTStore } from '../store/btStore';
import { treeToFlow, flowToTree, isSameTreeStructure } from '../utils/btFlow';
import { autoLayout } from '../utils/btLayout';
import BTFlowNode from './nodes/BTFlowNode';
import BTFlowEdge from './edges/BTFlowEdge';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeDefinition, BTProject, BTNodeCategory } from '../types/bt';
import { useContextMenu, type MenuConfig } from './ContextMenu';
import NodePicker from './NodePicker';
import NodeEditModal from './NodeEditModal';

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
    updateNodeName,
    setLocalCanvas,
  } = useBTStore();

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);

  // Context menu
  const { menuState, showMenu, hideMenu, ContextMenuComponent } = useContextMenu();

  // Node edit modal
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);

  // Incomplete connection picker (drag from handle to empty space)
  const [pendingConnection, setPendingConnection] = React.useState<{
    sourceNodeId: string;
    sourceHandleId: string | null;
    sourceHandleType: 'source' | 'target';
    position: { x: number; y: number };
  } | null>(null);

  const [nodePickerPosition, setNodePickerPosition] = React.useState<{ x: number; y: number } | null>(null);

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

  // Track source node when connection starts
  const onConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      if (params.nodeId && (params.handleType === 'source' || params.handleType === 'target')) {
        setPendingConnection({
          sourceNodeId: params.nodeId,
          sourceHandleId: params.handleId,
          sourceHandleType: params.handleType as 'source' | 'target',
          position: { x: 0, y: 0 },
        });
      }
    },
    []
  );

  // Handle picker selection (create node and connect)
  const handlePickerSelect = useCallback(
    (nodeType: string, category: BTNodeCategory) => {
      if (!nodePickerPosition) return;

      // Find the source node that was being connected from
      // We need to get this from the pending connection state
      // For now, we'll use the first selected node or find a better way
      const sourceNodeId = pendingConnection?.sourceNodeId;
      if (!sourceNodeId) {
        setNodePickerPosition(null);
        return;
      }

      // Create new node at picker position
      const newNodeId = `n_${Math.random().toString(36).slice(2, 9)}`;
      const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Control;
      const isLeaf = category === 'Action' || category === 'Condition';

      const newNode: Node = {
        id: newNodeId,
        type: 'btFlow',
        position: nodePickerPosition,
        data: {
          label: nodeType,
          nodeType,
          category,
          colors,
          ports: {},
          childrenCount: isLeaf ? 0 : 1,
        },
      };

      // Add new node and create edge from source to new node
      setNodes((prev) => [...prev, newNode]);
      setEdges((eds) => withSelectedEdge(
        addEdge({
          id: `e_${Math.random().toString(36).slice(2, 9)}`,
          source: sourceNodeId,
          target: newNodeId,
          type: 'btEdge',
          style: { stroke: '#6888aa', strokeWidth: 2 },
        }, eds),
        null,
        deleteEdge
      ));

      setNodePickerPosition(null);
      setPendingConnection(null);
    },
    [nodePickerPosition, pendingConnection, setNodes, setEdges, deleteEdge]
  );

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

  // Handle incomplete connection (drag ended without connecting to target)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: { toNode: unknown }) => {
      // If connection was completed (toNode is not null), do nothing
      // When dropped in empty space, 'toNode' will be null
      if (connectionState.toNode !== null) {
        setPendingConnection(null);
        return;
      }

      // The connection is from source -> empty space, show model picker
      const rfInstance = rfInstanceRef.current;
      if (!rfInstance) {
        setPendingConnection(null);
        return;
      }

      // Get client coordinates from the event
      const clientX = 'clientX' in event ? event.clientX : 0;
      const clientY = 'clientY' in event ? event.clientY : 0;

      // Convert client coordinates to flow coordinates
      const position = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });

      setNodePickerPosition({ x: position.x, y: position.y });
    },
    []
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedEdgeId(null);
      selectNode(node.id);
      if (menuState.show) hideMenu();
    },
    [selectNode, menuState.show, hideMenu]
  );

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    selectNode(null);
    if (menuState.show) hideMenu();
  }, [selectNode, menuState.show, hideMenu]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      selectNode(null);
      setSelectedEdgeId(edge.id);
      if (menuState.show) hideMenu();
    },
    [selectNode, menuState.show, hideMenu]
  );

  // Context menu handlers
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      showMenu(event, 'edge', edge.id);
    },
    [showMenu]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      showMenu(event, 'node', node.id);
    },
    [showMenu]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      showMenu(event, 'pane', null);
    },
    [showMenu]
  );

  // Save tree back to store when nodes/edges change (debounced)
  // This does NOT trigger the sync effect - they're decoupled
  const saveTimerRef = useRef<number | null>(null);
  const saveToStore = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        // Always read fresh localNodes/localEdges from store at execution time,
        // so edits via PropertiesPanel (which update localNodes directly) are saved correctly.
        const { localNodes: freshNodes, localEdges: freshEdges, project: p, activeTreeId: treeId } = useBTStore.getState();
        const tree = flowToTree(treeId, freshNodes, freshEdges);
        const currentTree = p.trees.find((t) => t.id === treeId);
        if (currentTree && isSameTreeStructure(currentTree, tree)) return;
        const trees = p.trees.map((t) => (t.id === treeId ? tree : t));
        useBTStore.setState({ project: { ...p, trees } });
      } catch {
        // ignore intermediate invalid states
      }
    }, 500);
  }, [activeTreeId]);

  React.useEffect(() => {
    saveToStore();
  }, [nodes, edges, saveToStore]);

  // Immediately sync localNodes/localEdges to store for lookup (not debounced)
  React.useEffect(() => {
    setLocalCanvas(nodes, edges);
  }, [nodes, edges, setLocalCanvas]);

  // Handle node edit modal trigger
  React.useEffect(() => {
    const handleNodeEdit = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      setEditingNodeId(customEvent.detail.nodeId);
    };

    window.addEventListener('bt-node-edit', handleNodeEdit);
    return () => window.removeEventListener('bt-node-edit', handleNodeEdit);
  }, []);

  // Handle edit modal save (for editing node instances on canvas)
  const handleEditSave = useCallback((data: {
    name?: string;
    ports: Record<string, string>;
    preconditions?: Record<string, string>;
    postconditions?: Record<string, string>;
    description?: string;
  }) => {
    if (!editingNodeId) return;

    // Update local nodes state for immediate UI feedback
    setNodes((prev) => {
      const node = prev.find((n) => n.id === editingNodeId);
      const nodeData = node?.data as {
        nodeType: string;
        label: string;
        ports?: Record<string, string>;
        preconditions?: Record<string, string>;
        postconditions?: Record<string, string>;
        description?: string;
      };
      if (!node || !nodeData) return prev;

      return prev.map((n) => {
        if (n.id === editingNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              label: data.name !== undefined ? data.name : nodeData.label,
              ports: data.ports ?? nodeData.ports,
              preconditions: data.preconditions ?? nodeData.preconditions,
              postconditions: data.postconditions ?? nodeData.postconditions,
              description: data.description,
            },
          };
        }
        return n;
      });
    });

    // Update store for persistence
    if (data.name !== undefined) {
      updateNodeName(editingNodeId, data.name);
    }
    if (data.ports !== undefined) {
      const { updateNodePorts } = useBTStore.getState();
      updateNodePorts(editingNodeId, data.ports);
    }
    if (data.preconditions !== undefined || data.postconditions !== undefined) {
      const { updateNodeConditions } = useBTStore.getState();
      updateNodeConditions(editingNodeId, data.preconditions, data.postconditions);
    }
  }, [editingNodeId, setNodes, updateNodeName]);

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
      const category = def?.category ?? 'Action';
      const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Action'];

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

  // Build dynamic menu config based on current context
  const dynamicMenuConfig: MenuConfig = useMemo(() => ({
    edge: menuState.targetType === 'edge' && menuState.targetId ? [
      {
        id: 'delete',
        label: 'Delete Edge',
        icon: '🗑️',
        danger: true,
        action: () => deleteEdge(menuState.targetId!),
      },
    ] : [],
    node: menuState.targetType === 'node' && menuState.targetId ? (() => {
      const nodeData = nodes.find((n) => n.id === menuState.targetId)?.data as { isRoot?: boolean } | undefined;
      const isRoot = nodeData?.isRoot === true;
      if (isRoot) return []; // ROOT node: no context menu
      return [{
        id: 'delete',
        label: 'Delete Node',
        icon: '🗑️',
        danger: true,
        action: () => {
          // Delete node and its edges
          setNodes((prev) => prev.filter((n) => n.id !== menuState.targetId));
          setEdges((prev) => prev.filter((e) => e.source !== menuState.targetId && e.target !== menuState.targetId));
        },
      }];
    })() : [],
    pane: menuState.targetType === 'pane' ? [
      {
        id: 'fitview',
        label: 'Fit View',
        icon: '🔍',
        action: () => rfInstanceRef.current?.fitView(),
      },
    ] : [],
  }), [menuState, deleteEdge]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
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

      {/* Context Menu */}
      {menuState.show && (
        <ContextMenuComponent
          position={menuState.position}
          targetType={menuState.targetType}
          menuConfig={dynamicMenuConfig}
          onClose={hideMenu}
        />
      )}

      {/* Node Edit Modal */}
      {editingNodeId && (() => {
        const node = nodes.find((n) => n.id === editingNodeId);
        if (!node) return null;
        const data = node.data as {
          nodeType: string;
          category: string;
          label: string;
          ports?: Record<string, string>;
          preconditions?: Record<string, string>;
          postconditions?: Record<string, string>;
          description?: string;
        };
        return (
          <NodeEditModal
            nodeId={node.id}
            nodeType={data.nodeType}
            nodeCategory={data.category}
            nodeName={data.label !== data.nodeType ? data.label : undefined}
            ports={data.ports ?? {}}
            preconditions={data.preconditions}
            postconditions={data.postconditions}
            description={data.description}
            availableTrees={project.trees.map((t) => t.id)}
            onSave={handleEditSave}
            onClose={() => setEditingNodeId(null)}
          />
        );
      })()}

      {/* Node Picker (shown when dragging from handle to empty space) */}
      {nodePickerPosition && (
        <NodePicker
          position={nodePickerPosition}
          onSelect={handlePickerSelect}
          onClose={() => setNodePickerPosition(null)}
        />
      )}
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

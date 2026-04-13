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
  SelectionMode,
} from '@xyflow/react';
import type { Connection, Node, Edge, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import html2canvas from 'html2canvas';

import { useBTStore } from '../store/btStore';
import { treeToFlow, flowToTree, isSameTreeStructure, getDescendantIds } from '../utils/btFlow';

// Collect all child node IDs (edges) from a tree recursively
function collectEdgeIds(node: BTTreeNode): string[] {
  const ids: string[] = node.children.map((c) => c.id);
  node.children.forEach((child) => {
    ids.push(...collectEdgeIds(child));
  });
  return ids;
}
import type { BTNodeDefinition, BTProject, BTNodeCategory, BTPort, BTTreeNode } from '../types/bt';
import { autoLayout } from '../utils/btLayout';
import { validatePortConnection } from '../utils/btXml';
import BTFlowNode from './nodes/BTFlowNode';
import BTFlowEdge from './edges/BTFlowEdge';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';
import { useContextMenu, type MenuConfig, type MenuItem } from './ContextMenu';
import NodePicker from './NodePicker';
import NodeEditModal from './NodeEditModal';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import NodeSearchModal from './NodeSearchModal';

const nodeTypes = { btNode: BTFlowNode };
const edgeTypes = { btEdge: BTFlowEdge };

/**
 * Get port definition for a specific port on a node type.
 * Looks in both BUILTIN_NODES and nodeModels.
 */
function getPortDefinition(
  nodeType: string,
  portName: string,
  nodeModels: BTNodeDefinition[]
): BTPort | undefined {
  const builtin = BUILTIN_NODES.find((n) => n.type === nodeType);
  const model = nodeModels.find((n) => n.type === nodeType);
  const ports = builtin?.ports ?? model?.ports;
  return ports?.find((p) => p.name === portName);
}

/**
 * Determine the implied port direction based on handle type and node category.
 * For built-in nodes without explicit port definitions, we infer direction.
 */
function inferPortDirection(
  handleType: 'source' | 'target' | null,
  nodeType: string,
  nodeModels: BTNodeDefinition[]
): 'input' | 'output' | 'inout' | undefined {
  // If we have explicit port info from node model, use it
  const portDef = handleType ? getPortDefinition(nodeType, handleType, nodeModels) : undefined;
  if (portDef) return portDef.direction;

  // Fall back to inferring from handle type
  if (handleType === 'target') return 'input';
  if (handleType === 'source') return 'output';
  return undefined;
}

/**
 * Check if a target node is a leaf node (Action/Condition) that can't accept children.
 * Returns a warning message if invalid.
 */
function checkLeafTargetConnection(
  targetNodeId: string,
  nodes: Node[]
): string | undefined {
  const target = nodes.find((n) => n.id === targetNodeId);
  if (!target) return undefined;
  const data = target.data as { category?: string };
  const category = data?.category;
  if (category === 'Action' || category === 'Condition') {
    return 'Leaf nodes (Action/Condition) cannot have children';
  }
  return undefined;
}

function buildFlowNodes(
  treeId: string,
  project: BTProject,
  debugStatuses: Map<string, import('../types/bt').NodeStatus>
): { nodes: Node[]; edges: Edge[] } {
  const tree = project.trees.find((t) => t.id === treeId);
  if (!tree) return { nodes: [], edges: [] };
  let { nodes, edges } = treeToFlow(tree, project.nodeModels);
  nodes = autoLayout(nodes, edges);
  // Inject debug statuses into nodes
  nodes = nodes.map((n) => ({
    ...n,
    data: { ...n.data, status: debugStatuses.get(n.id) ?? 'IDLE' },
  }));
  // Inject target node status into edges (for RUNNING edge animation)
  edges = edges.map((e) => ({
    ...e,
    data: { ...e.data, targetStatus: debugStatuses.get(e.target) ?? 'IDLE' },
  }));
  return { nodes, edges };
}

const BTCanvas: React.FC = () => {
  const {
    project,
    activeTreeId,
    selectNode,
    selectedNodeIds,
    clearSelection,
    toggleSelection,
    debugState,
    addNodeModel,
    updateNodeName,
    setLocalCanvas,
    copyNode,
    pasteNode,
    pushHistory,
    collapsedNodeIds,
    toggleNodeCollapse,
  } = useBTStore();

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  // Track last pane click for double-click detection
  const lastPaneClickRef = React.useRef<number>(0);

  // Context menu
  const { menuState, showMenu, hideMenu, ContextMenuComponent } = useContextMenu();

  // Node edit modal
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);

  // Keyboard shortcuts help modal
  // Node search modal
  const [showNodeSearch, setShowNodeSearch] = React.useState(false);

  // Keyboard shortcuts help modal
  const [showHelp, setShowHelp] = React.useState(false);

  // Incomplete connection picker (drag from handle to empty space)
  const [pendingConnection, setPendingConnection] = React.useState<{
    sourceNodeId: string;
    sourceHandleId: string | null;
    sourceHandleType: 'source' | 'target';
    position: { x: number; y: number };
  } | null>(null);

  const [nodePickerPosition, setNodePickerPosition] = React.useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);

  // Track nodes that became orphan (disconnected from tree) - they stay on canvas but excluded from tree
  const [detachedNodeIds, setDetachedNodeIds] = React.useState<Set<string>>(new Set());

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
    setEdges((prev) => {
      const edge = prev.find((e) => e.id !== edgeId);
      if (!edge) return prev;

      const targetId = edge.target;
      const remainingEdges = prev.filter((e) => e.id !== edgeId);

      // Check if target has any other incoming edges
      const hasOtherIncoming = remainingEdges.some((e) => e.target === targetId);

      if (!hasOtherIncoming) {
        // Target is now orphan - check if it's a leaf node
        // If so, remove it along with the edge to avoid saveToStore excluding it
        setNodes((nodes) => {
          const targetNode = nodes.find((n) => n.id === targetId);
          const category = targetNode?.data?.category;
          if (category === 'Action' || category === 'Condition') {
            return nodes.filter((n) => n.id !== targetId);
          }
          return nodes;
        });
      }

      return remainingEdges;
    });
    setSelectedEdgeId((prev) => (prev === edgeId ? null : prev));
  }, [setEdges, setNodes]);

  // ── Ctrl+Drag Subtree ──────────────────────────────────────────────────────
  // Track Ctrl key state separately via keydown/keyup so we can detect it reliably
  const ctrlKeyRef = useRef(false);

  // Track ctrl+drag state: isCtrlDragging, draggedNodeId, and original positions
  const ctrlDragRef = useRef<{
    isCtrlDragging: boolean;
    draggedNodeId: string | null;
    // nodeId -> { x, y } of all descendants at drag start
    startPositions: Map<string, { x: number; y: number }>;
  }>({ isCtrlDragging: false, draggedNodeId: null, startPositions: new Map() });

  // Set up global Ctrl key tracking
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        ctrlKeyRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        ctrlKeyRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!ctrlKeyRef.current) return;
      const descendantIds = getDescendantIds(node.id, edges);
      if (descendantIds.length === 0) return; // No subtree to drag

      // Push history before moving
      useBTStore.getState().pushHistory();

      // Get current node positions from store (most up-to-date)
      const currentNodes = useBTStore.getState().localNodes;

      // Record start positions of dragged node and all descendants
      const startPositions = new Map<string, { x: number; y: number }>();
      const draggedNodeCurrent = currentNodes.find((n) => n.id === node.id);
      if (draggedNodeCurrent) {
        startPositions.set(node.id, { ...draggedNodeCurrent.position });
      }
      currentNodes.forEach((n) => {
        if (descendantIds.includes(n.id)) {
          startPositions.set(n.id, { ...n.position });
        }
      });

      ctrlDragRef.current = {
        isCtrlDragging: true,
        draggedNodeId: node.id,
        startPositions,
      };
    },
    [edges]
  );

  const onNodeDragStop = useCallback(() => {
    ctrlDragRef.current = {
      isCtrlDragging: false,
      draggedNodeId: null,
      startPositions: new Map(),
    };
  }, []);

  // onNodeDrag fires during drag — we handle subtree movement in handleNodesChange
  const onNodeDrag = useCallback((_event: React.MouseEvent, _node: Node) => {
    // Subtree movement handled in handleNodesChange based on position changes
  }, []);

  // Intercept position changes to apply Ctrl+drag subtree delta
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const { isCtrlDragging, draggedNodeId, startPositions } = ctrlDragRef.current;

      if (!isCtrlDragging || !draggedNodeId) {
        onNodesChange(changes);
        return;
      }

      // Find position change for the dragged root node
      const positionChange = changes.find(
        (c) => c.type === 'position' && c.id === draggedNodeId && c.position
      );

      if (!positionChange) {
        onNodesChange(changes);
        return;
      }

      const { position: newPos } = positionChange as { type: 'position'; id: string; position: { x: number; y: number } };
      const origPos = startPositions.get(draggedNodeId);
      if (!origPos || !newPos) {
        onNodesChange(changes);
        return;
      }

      const dx = newPos.x - origPos.x;
      const dy = newPos.y - origPos.y;

      if (dx === 0 && dy === 0) {
        onNodesChange(changes);
        return;
      }

      // Build updated nodes array: move all descendants by the same delta
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggedNodeId) {
            // Let ReactFlow handle the dragged node via onNodesChange
            return n;
          }
          const orig = startPositions.get(n.id);
          if (!orig) return n;
          return { ...n, position: { x: orig.x + dx, y: orig.y + dy } };
        })
      );

      // Also let ReactFlow process the original change for the dragged node
      onNodesChange(changes);
    },
    [onNodesChange, setNodes]
  );

  // Sync: responds to tree switch and external project changes (like XML load)
  // NOT triggered by our own saveToStore (we use forceLayoutRef for that)
  React.useEffect(() => {
    // Force layout when switching trees or first load OR when project changed (e.g., loaded new XML)
    const shouldForceLayout = forceLayoutRef.current || lastSyncedTreeRef.current !== activeTreeId;
    if (shouldForceLayout) {
      // Full rebuild with autoLayout for tree switch or initial load
      const { nodes: n, edges: e } = buildFlowNodes(activeTreeId, project, debugState.nodeStatuses);
      // Apply collapsed filter
      const collapsed = useBTStore.getState().collapsedNodeIds;
      const collapsedDescendants = new Set<string>();
      e.forEach((edge) => {
        if (collapsed.has(edge.source)) {
          // source is collapsed, mark all its descendants
          const desc = getDescendantIds(edge.source, e);
          desc.forEach(d => collapsedDescendants.add(d));
        }
      });
      const visibleNodes = n.map((node) => ({
        ...node,
        hidden: collapsedDescendants.has(node.id),
        data: { ...node.data, isCollapsed: collapsed.has(node.id) },
      }));
      setNodes(visibleNodes);
      setEdges(withSelectedEdge(e, selectedEdgeId, deleteEdge));
      lastSyncedTreeRef.current = activeTreeId;
      forceLayoutRef.current = false;
    } else {
      // Incremental update: only sync structure from project, preserve existing positions
      const tree = project.trees.find((t) => t.id === activeTreeId);
      if (!tree) return;
      const { nodes: newNodes, edges: newEdges } = treeToFlow(tree, project.nodeModels);

      // Apply autoLayout to properly position all nodes
      const laidOutNodes = autoLayout(newNodes, newEdges);

      // Apply collapsed filter
      const collapsed = useBTStore.getState().collapsedNodeIds;
      const collapsedDescendants = new Set<string>();
      newEdges.forEach((edge) => {
        if (collapsed.has(edge.source)) {
          const desc = getDescendantIds(edge.source, newEdges);
          desc.forEach(d => collapsedDescendants.add(d));
        }
      });

      // Merge: keep existing positions from local nodes state, but use layout positions for new nodes
      setNodes((prevNodes) => {
        const existingPositions = new Map(prevNodes.map((n) => [n.id, n.position]));
        const merged = laidOutNodes.map((n) => ({
          ...n,
          hidden: collapsedDescendants.has(n.id),
          position: existingPositions.get(n.id) ?? n.position,
          selected: selectedNodeIds.has(n.id),
          data: {
            ...n.data,
            isCollapsed: collapsed.has(n.id),
            status: debugState.nodeStatuses.get(n.id) ?? 'IDLE',
          },
        }));

        // Add back detached (orphan) nodes - they should stay on canvas even after project sync
        const attachedIds = new Set(laidOutNodes.map((n) => n.id));
        const detachedToRestore = nodes.filter((n) => detachedNodeIds.has(n.id) && !attachedIds.has(n.id));
        return [...merged, ...detachedToRestore];
      });
      // Inject target node status into edges for RUNNING animation
      const edgesWithStatus = newEdges.map((e) => ({
        ...e,
        data: { ...e.data, targetStatus: debugState.nodeStatuses.get(e.target) ?? 'IDLE' },
      }));
      setEdges(withSelectedEdge(edgesWithStatus, selectedEdgeId, deleteEdge));
    }
  }, [activeTreeId, project, debugState.nodeStatuses, selectedEdgeId, deleteEdge, collapsedNodeIds, detachedNodeIds, nodes]);

  // Highlight selected nodes
  React.useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: selectedNodeIds.has(n.id),
      }))
    );
  }, [selectedNodeIds, setNodes]);

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
      // Ensure category is valid key in CATEGORY_COLORS
      const validCategory = category && category in CATEGORY_COLORS ? category : 'Control';
      const colors = CATEGORY_COLORS[validCategory] ?? CATEGORY_COLORS.Control;
      const isLeaf = category === 'Action' || category === 'Condition';

      const newNode: Node = {
        id: newNodeId,
        type: 'btNode',
        position: { x: nodePickerPosition.flowX, y: nodePickerPosition.flowY },
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

  // Validate connection based on BT rules
  const isValidConnection = useCallback(
    (sourceNode: Node, existingEdges: Edge[]): boolean => {
      const sourceCategory = (sourceNode.data as { category?: string }).category;

      // Leaf nodes (Action/Condition) cannot have outgoing connections
      if (sourceCategory === 'Action' || sourceCategory === 'Condition') {
        return false;
      }

      // ROOT can only have ONE child
      if (sourceCategory === 'ROOT') {
        const existingEdgesFromRoot = existingEdges.filter((e) => e.source === sourceNode.id);
        if (existingEdgesFromRoot.length > 0) {
          return false; // ROOT already has a child
        }
      }

      // Decorator can only have ONE child
      if (sourceCategory === 'Decorator') {
        const existingEdgesFromDecorator = existingEdges.filter((e) => e.source === sourceNode.id);
        if (existingEdgesFromDecorator.length > 0) {
          return false; // Decorator already has a child
        }
      }

      // Control nodes and SubTree can have multiple children - always valid
      return true;
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Validate connection
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !params.source || !params.target) {
        return; // Invalid source node or missing IDs
      }

      if (!isValidConnection(sourceNode, edges)) {
        return; // Connection not allowed by BT rules
      }

      // ── Cycle detection ────────────────────────────────────────────────────
      // Detect if adding this edge would create a cycle (A→B→A pattern).
      // We traverse FROM the target following outgoing edges; if we can reach
      // the source, then source→target would close a loop.
      const visited = new Set<string>();
      const stack = [params.target];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (cur === params.source) {
          // Would create a cycle — silently block the connection
          return;
        }
        if (visited.has(cur)) continue;
        visited.add(cur);
        for (const edge of edges) {
          if (edge.source === cur) {
            stack.push(edge.target);
          }
        }
      }

      // Determine type warning for the connection
      let typeWarning: string | undefined;
      const { nodeModels } = project;

      // Check if target is a leaf node (can't accept children)
      if (targetNode) {
        const leafError = checkLeafTargetConnection(params.target!, nodes);
        if (leafError) return; // Block connection to leaf nodes
      }

      // If no leaf error, check port type compatibility
      if (!typeWarning && params.sourceHandle && params.targetHandle) {
        const sourceData = sourceNode.data as { nodeType: string };
        const targetData = targetNode?.data as { nodeType: string };

        const sourceDirection = inferPortDirection(
          params.sourceHandle as 'source' | 'target',
          sourceData.nodeType,
          nodeModels
        );
        const targetDirection = inferPortDirection(
          params.targetHandle as 'source' | 'target',
          targetData?.nodeType ?? '',
          nodeModels
        );

        if (sourceDirection && targetDirection) {
          const sourcePortDef = getPortDefinition(sourceData.nodeType, params.sourceHandle, nodeModels);
          const targetPortDef = getPortDefinition(targetData?.nodeType ?? '', params.targetHandle, nodeModels);

          const result = validatePortConnection(
            { name: params.sourceHandle, direction: sourceDirection, type: sourcePortDef?.portType },
            { name: params.targetHandle, direction: targetDirection, type: targetPortDef?.portType }
          );
          typeWarning = result.warning;
        }
      }

      useBTStore.getState().pushHistory();
      setSelectedEdgeId(null);

      // Build edge data with type warning info and target node status (for RUNNING animation)
      const edgeData: Record<string, unknown> = {
        onDelete: deleteEdge,
        sourcePort: params.sourceHandle ?? undefined,
        targetPort: params.targetHandle ?? undefined,
        typeWarning,
        targetStatus: targetNode ? (debugState.nodeStatuses.get(targetNode.id) ?? 'IDLE') : 'IDLE',
      };

      setEdges((eds) => withSelectedEdge(
        addEdge({
          ...params,
          type: 'btEdge',
          style: { stroke: '#6888aa', strokeWidth: 2 },
          data: edgeData,
        }, eds),
        null,
        deleteEdge
      ));
    },
    [deleteEdge, setEdges, nodes, edges, isValidConnection, project.nodeModels, debugState.nodeStatuses]
  );

  // Handle incomplete connection (drag ended without connecting to target)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: { toNode: unknown; fromNode?: unknown }) => {
      // If connection was completed (toNode is not null/undefined), do nothing
      // Also check fromNode to detect if a connection was in progress
      // NoConnection has fromNode: null, ConnectionInProgress has fromNode: NodeType
      if (connectionState.toNode != null && connectionState.fromNode != null) {
        setPendingConnection(null);
        return;
      }

      // If fromNode is null, no connection was in progress
      if (connectionState.fromNode == null) {
        setPendingConnection(null);
        return;
      }

      // The connection is from source -> empty space, show model picker
      const rfInstance = rfInstanceRef.current;
      if (!rfInstance) {
        setPendingConnection(null);
        return;
      }

      // Get client coordinates from the event (use these directly for fixed positioning)
      const clientX = 'clientX' in event ? event.clientX : 0;
      const clientY = 'clientY' in event ? event.clientY : 0;

      // Also convert to flow coordinates for node placement
      const flowPosition = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });

      // Store both: client position for picker UI, flow position for node placement
      setNodePickerPosition({ x: clientX, y: clientY, flowX: flowPosition.x, flowY: flowPosition.y });
    },
    []
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedEdgeId(null);
      
      // Ctrl+click: toggle multi-selection
      if (event.ctrlKey || event.metaKey) {
        toggleSelection(node.id);
      } else {
        // Regular click: single select
        selectNode(node.id);
      }
      
      if (menuState.show) hideMenu();
      setNodePickerPosition(null);
    },
    [selectNode, toggleSelection, menuState.show, hideMenu]
  );

  const onPaneClick = useCallback(() => {
    // Update zoom level display
    const zoom = rfInstanceRef.current?.getZoom();
    if (zoom) setZoomLevel(zoom);

    // Detect double-click on pane to reset zoom
    const now = Date.now();
    if (now - lastPaneClickRef.current < 300) {
      // Double-click detected - reset zoom to fit view
      rfInstanceRef.current?.fitView({ duration: 300 });
      setZoomLevel(1);
    }
    lastPaneClickRef.current = now;

    if (showHelp) setShowHelp(false);
    setSelectedEdgeId(null);
    clearSelection();
    if (menuState.show) hideMenu();
    // Note: don't close nodePickerPosition here - it will be closed by:
    // - NodePicker's click outside handler
    // - NodePicker's Escape key handler
    // - onNodeClick / onEdgeClick when clicking on nodes/edges
  }, [clearSelection, menuState.show, hideMenu, showHelp]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      selectNode(null);
      setSelectedEdgeId(edge.id);
      if (menuState.show) hideMenu();
      setNodePickerPosition(null);
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

  // Batch selection: drag-to-select handler
  const onSelectionStart = useCallback(() => {
    // Clear existing selection when starting a drag selection
    // (unless Ctrl is held, in which case we want to add to selection)
  }, []);

  const onSelectionChange = useCallback(
    (params: { nodes: Node[] }) => {
      // Update selectedNodeIds in store based on drag selection
      const selectedIds = new Set(params.nodes.map((n) => n.id));
      // Replace the entire selection with the dragged selection
      useBTStore.getState().setSelectedNodes(selectedIds);
    },
    []
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

        // Filter out detached (orphan) nodes when saving to keep tree structure clean
        const attachedNodes = freshNodes.filter((n) => !detachedNodeIds.has(n.id));
        const tree = flowToTree(treeId, attachedNodes, freshEdges);
        const currentTree = p.trees.find((t) => t.id === treeId);

        // Only skip save if node structure unchanged AND edges unchanged.
        // isSameTreeStructure checks node IDs/types/ports/children, but not edge identity.
        // Edge identity = which specific child IDs each parent has.
        // If edge IDs differ, the tree must be re-saved even if child count is same.
        const currentEdgeIds = currentTree ? collectEdgeIds(currentTree.root) : [];
        const newEdgeIds = collectEdgeIds(tree.root);
        const edgesUnchanged = currentTree && isSameTreeStructure(currentTree, tree) && JSON.stringify(currentEdgeIds) === JSON.stringify(newEdgeIds);
        if (edgesUnchanged) return;

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

  // When PropertiesPanel saves (updates localNodes), sync to ReactFlow nodes
  // This handles Apply button for port values, name changes, etc.
  React.useEffect(() => {
    const handleNodesUpdated = () => {
      // Read fresh localNodes from store and update ReactFlow's nodes state
      const { localNodes: freshNodes } = useBTStore.getState();
      if (freshNodes.length > 0) {
        // Merge fresh node data into existing nodes (keep ReactFlow-specific props like position)
        setNodes((prev) =>
          prev.map((n) => {
            const fresh = freshNodes.find((f) => f.id === n.id);
            if (fresh) {
              // Keep position/handleBounds from ReactFlow state, update data from store
              return { ...n, data: { ...fresh.data } };
            }
            return n;
          })
        );
      }
    };

    window.addEventListener('bt-nodes-updated', handleNodesUpdated);
    return () => window.removeEventListener('bt-nodes-updated', handleNodesUpdated);
  }, [setNodes]);

  // Handle node edit modal trigger
  React.useEffect(() => {
    const handleNodeEdit = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      setEditingNodeId(customEvent.detail.nodeId);
    };

    window.addEventListener('bt-node-edit', handleNodeEdit);
    return () => window.removeEventListener('bt-node-edit', handleNodeEdit);
  }, []);

  // Handle PNG export
  React.useEffect(() => {
    const handleExportPNG = async () => {
      const flowElement = document.querySelector('.react-flow') as HTMLElement;
      if (!flowElement) return;

      try {
        const canvas = await html2canvas(flowElement, {
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0f0f1e',
          scale: 2,
          logging: false,
          useCORS: true,
        });

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${useBTStore.getState().activeTreeId || 'behavior-tree'}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export PNG:', err);
      }
    };

    window.addEventListener('bt-export-png', handleExportPNG);
    return () => window.removeEventListener('bt-export-png', handleExportPNG);
  }, []);

  // Handle edit modal save (for editing node instances on canvas)
  const handleEditSave = useCallback((data: {
    name?: string;
    ports: Record<string, string>;
    preconditions?: Record<string, string>;
    postconditions?: Record<string, string>;
    description?: string;
    portRemap?: Record<string, string>;
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
        portRemap?: Record<string, string>;
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
              portRemap: data.portRemap,
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
    if (data.portRemap !== undefined) {
      const { updateNodePortRemap } = useBTStore.getState();
      updateNodePortRemap(editingNodeId, data.portRemap);
    }
  }, [editingNodeId, setNodes, updateNodeName]);

  // Navigate to and select a node from search
  const handleNodeSearchSelect = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !rfInstanceRef.current) return;

      // Center the view on the node and zoom in
      rfInstanceRef.current.setCenter(node.position.x + 80, node.position.y + 40, {
        zoom: 1.5,
        duration: 400,
      });

      // Select the node and clear edge selection
      selectNode(nodeId);
      setSelectedEdgeId(null);
      setShowNodeSearch(false);
    },
    [nodes, selectNode, setSelectedEdgeId, setShowNodeSearch]
  );

  React.useEffect(() => {
    setEdges((prev) => withSelectedEdge(prev, selectedEdgeId, deleteEdge));
  }, [selectedEdgeId, deleteEdge, setEdges]);

  React.useEffect(() => {
    if (!selectedEdgeId) return;
    if (edges.some((edge) => edge.id === selectedEdgeId)) return;
    setSelectedEdgeId(null);
  }, [edges, selectedEdgeId]);

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      // Delete/Backspace to delete selected node(s) or edge
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedNodeIds.size > 0) {
          // Protect ROOT: never allow ROOT to be deleted via keyboard
          const { localNodes } = useBTStore.getState();
          const rootIds = new Set(localNodes.filter((n) => (n.data as { isRoot?: boolean }).isRoot).map((n) => n.id));
          const idsToDelete = new Set([...selectedNodeIds].filter((id) => !rootIds.has(id)));
          if (idsToDelete.size === 0) return; // Only ROOT was selected, do nothing
          useBTStore.getState().pushHistory();
          setNodes((prev) => prev.filter((n) => !idsToDelete.has(n.id)));
          setEdges((prev) => prev.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)));
          clearSelection();
        } else if (selectedEdgeId) {
          useBTStore.getState().pushHistory();
          deleteEdge(selectedEdgeId);
        }
        return;
      }

      // Ctrl+Z: Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        useBTStore.getState().undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        useBTStore.getState().redo();
        return;
      }

      // F: Fit view
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        rfInstanceRef.current?.fitView();
        return;
      }

      // Escape: Deselect or close modals
      if (event.key === 'Escape') {
        if (showNodeSearch) {
          setShowNodeSearch(false);
          return;
        }
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        selectNode(null);
        setSelectedEdgeId(null);
        return;
      }

      // /: Open node search (only when not in an input field)
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '')) {
        event.preventDefault();
        setShowNodeSearch(true);
        return;
      }

      // ?: Show keyboard shortcuts help
      if (event.key === '?' || event.key === 'F1') {
        event.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Ctrl+A: Select all nodes
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        const allIds = new Set(nodes.map((n) => n.id));
        useBTStore.getState().clearSelection();
        allIds.forEach((id) => useBTStore.getState().addToSelection(id));
        return;
      }

      // Arrow keys: nudge selected nodes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && selectedNodeIds.size > 0) {
        // Only nudge when not in an input field and no modifier keys (except shift for larger nudge)
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        event.preventDefault();
        const step = event.shiftKey ? 20 : 5;
        let dx = 0, dy = 0;
        if (event.key === 'ArrowUp') dy = -step;
        if (event.key === 'ArrowDown') dy = step;
        if (event.key === 'ArrowLeft') dx = -step;
        if (event.key === 'ArrowRight') dx = step;
        useBTStore.getState().pushHistory();
        setNodes((prev) =>
          prev.map((n) => {
            if (!selectedNodeIds.has(n.id)) return n;
            return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
          })
        );
        return;
      }

      // Ctrl+C: Copy selected node(s)
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && selectedNodeIds.size > 0) {
        event.preventDefault();
        // Copy the first selected node (for simple copy/paste)
        const nodeToCopy = nodes.find((n) => n.id === Array.from(selectedNodeIds)[0]);
        if (nodeToCopy) {
          copyNode(nodeToCopy);
        }
        return;
      }

      // Ctrl+V: Paste copied node
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        const newNode = pasteNode();
        if (newNode) {
          pushHistory();
          setNodes((prev) => [...prev, newNode]);
          selectNode(newNode.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteEdge, selectNode, clearSelection, selectedEdgeId, selectedNodeIds, nodes, copyNode, pasteNode, pushHistory, showHelp, setShowHelp, showNodeSearch, setShowNodeSearch]);

  // Handle toolbar help button
  React.useEffect(() => {
    const handleToggleHelp = () => setShowHelp((prev) => !prev);
    window.addEventListener('bt-toggle-shortcuts-help', handleToggleHelp);
    return () => window.removeEventListener('bt-toggle-shortcuts-help', handleToggleHelp);
  }, []);

  // Drag-over handler for dropping from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Check for favorite template drop first
      const templateData = event.dataTransfer.getData('application/bt-template');
      if (templateData && rfInstanceRef.current) {
        const template = JSON.parse(templateData);
        const position = rfInstanceRef.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const def: BTNodeDefinition | undefined = project.nodeModels.find((m) => m.type === template.type)
          ?? BUILTIN_NODES.find((m) => m.type === template.type);
        const category = def?.category ?? template.category ?? 'Action';
        const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Action'];

        const newNode: Node = {
          id: `n_${Math.random().toString(36).slice(2, 9)}`,
          type: 'btNode',
          position,
          data: {
            label: template.name || template.type,
            nodeType: template.type,
            category,
            colors,
            ports: template.ports || {},
            preconditions: template.preconditions,
            postconditions: template.postconditions,
            childrenCount: 0,
          },
        };

        useBTStore.getState().pushHistory();
        setNodes((nds) => [...nds, newNode]);
        setSelectedEdgeId(null);
        return;
      }

      // Handle regular node type drop
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
        useBTStore.getState().pushHistory();
        addNodeModel({ type: nodeType, category });
      } else {
        useBTStore.getState().pushHistory();
      }

      setNodes((nds) => [...nds, newNode]);
      setSelectedEdgeId(null);
    },
    [project.nodeModels, addNodeModel, setNodes]
  );

  // Check for unconnected nodes (no incoming AND no outgoing edges)
  const unconnectedNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    return nodes.filter((n) => {
      // Skip ROOT - it doesn't need connections
      const data = n.data as { isRoot?: boolean };
      if (data?.isRoot) return false;
      const hasIncoming = edges.some((e) => e.target === n.id);
      const hasOutgoing = edges.some((e) => e.source === n.id);
      return !hasIncoming && !hasOutgoing;
    });
  }, [nodes, edges]);

  // Build dynamic menu config based on current context
  const dynamicMenuConfig: MenuConfig = useMemo(() => {
    const targetNodeId = menuState.targetId;
    const targetNode = targetNodeId ? nodes.find((n) => n.id === targetNodeId) : null;
    const targetData = targetNode?.data as { isRoot?: boolean; type?: string; ports?: Record<string, string>; category?: string; name?: string; description?: string; childrenCount?: number; isCollapsed?: boolean } | undefined;
    const isRoot = targetData?.isRoot === true;
    const hasChildren = (targetData?.childrenCount ?? 0) > 0;
    // Read collapsed state from store (authoritative)
    const collapsedSet = useBTStore.getState().collapsedNodeIds;
    const isCollapsed = targetNodeId ? collapsedSet.has(targetNodeId) : false;

    return {
      edge: menuState.targetType === 'edge' && menuState.targetId ? [
        {
          id: 'delete',
          label: 'Delete Edge',
          icon: '🗑️',
          danger: true,
          action: () => {
            useBTStore.getState().pushHistory();
            deleteEdge(menuState.targetId!);
          },
        },
      ] : [],
      node: menuState.targetType === 'node' && menuState.targetId && !isRoot ? [
        {
          id: 'copy',
          label: '📋 Copy Node',
          icon: '📋',
          action: () => {
            // Look up node directly from store at action time to avoid stale closure
            const nodeToCopy = menuState.targetId
              ? (useBTStore.getState().localNodes.find((n) => n.id === menuState.targetId) ?? null)
              : null;
            if (nodeToCopy) copyNode(nodeToCopy);
          },
        },
        {
          id: 'delete',
          label: '🗑️ Delete Node',
          icon: '🗑️',
          danger: true,
          action: () => {
            if (!menuState.targetId) return;
            useBTStore.getState().pushHistory();
            const deletedId = menuState.targetId;
            setNodes((prev) => prev.filter((n) => n.id !== deletedId));
            setEdges((prev) => prev.filter((e) => e.source !== deletedId && e.target !== deletedId));
            // Remove from detached set if it was tracked as orphan
            setDetachedNodeIds((prev) => {
              const next = new Set(prev);
              next.delete(deletedId);
              return next;
            });
          },
        },
        ...(hasChildren ? [{
          id: 'delete-subtree',
          label: '🗑️ Delete Subtree',
          icon: '🗑️',
          danger: true,
          action: () => {
            if (!menuState.targetId) return;
            useBTStore.getState().pushHistory();

            // Get all descendant node IDs (subtree)
            const subtreeNodeIds = new Set<string>();
            subtreeNodeIds.add(menuState.targetId);
            const descendants = getDescendantIds(menuState.targetId, edges);
            descendants.forEach((id) => subtreeNodeIds.add(id));

            // Delete all nodes in subtree
            setNodes((prev) => prev.filter((n) => !subtreeNodeIds.has(n.id)));
            // Delete all edges connected to subtree nodes
            setEdges((prev) => prev.filter((e) => !subtreeNodeIds.has(e.source) && !subtreeNodeIds.has(e.target)));
            // Remove deleted nodes from detached set
            setDetachedNodeIds((prev) => {
              const next = new Set(prev);
              subtreeNodeIds.forEach((id) => next.delete(id));
              return next;
            });
          },
        }] : []),
        ...(hasChildren ? [{
          id: 'collapse',
          label: isCollapsed ? '▶ Expand Subtree' : '▼ Collapse Subtree',
          icon: isCollapsed ? '▶' : '▼',
          action: () => {
            if (menuState.targetId) {
              toggleNodeCollapse(menuState.targetId);
            }
          },
        }] : []),
        {
          id: 'info',
          label: 'ℹ️ Node Info',
          icon: 'ℹ️',
          action: () => {
            if (!targetData) return;
            const info = [
              `Type: ${targetData.type}`,
              `Category: ${targetData.category}`,
              targetData.name ? `Name: ${targetData.name}` : null,
              targetData.description ? `Description: ${targetData.description}` : null,
              `Children: ${targetData.childrenCount ?? 0}`,
            ].filter(Boolean).join('\n');
            alert(`Node Info\n${'─'.repeat(20)}\n${info}`);
          },
        },
        { id: 'sep-save', label: '', separator: true } as MenuItem,
        {
          id: 'save-template',
          label: '⭐ Save as Template',
          icon: '⭐',
          action: () => {
            if (targetData?.type) {
              useBTStore.getState().addFavorite({
                name: targetData.name || targetData.type,
                type: targetData.type,
                ports: targetData.ports,
                category: targetData.category || 'Action',
              });
            }
          },
        },
      ] : [],
      pane: menuState.targetType === 'pane' ? [
        ...(useBTStore.getState().clipboard ? [{
          id: 'paste',
          label: '📋 Paste Node',
          icon: '📋',
          action: () => {
            const newNode = pasteNode();
            if (newNode) {
              pushHistory();
              setNodes((prev) => [...prev, newNode]);
              selectNode(newNode.id);
            }
          },
        }] : []),
        {
          id: 'add',
          label: '➕ Add Node',
          icon: '➕',
          action: () => {
            // Open node picker at center of viewport
            const rf = rfInstanceRef.current;
            if (rf) {
              const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
              setNodePickerPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2, flowX: center.x, flowY: center.y });
            }
          },
        },
        { id: 'sep-select', label: '', separator: true } as MenuItem,
        {
          id: 'selectall',
          label: '☑️ Select All',
          icon: '☑️',
          action: () => {
            const allIds = new Set(nodes.map((n) => n.id));
            clearSelection();
            allIds.forEach((id) => useBTStore.getState().addToSelection(id));
          },
        },
        {
          id: 'fitview',
          label: '🔍 Fit View',
          icon: '🔍',
          action: () => rfInstanceRef.current?.fitView(),
        },
      ] : [],
    };
  }, [menuState, nodes, deleteEdge, copyNode, pasteNode, pushHistory, selectNode, clearSelection, toggleNodeCollapse]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
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
        onSelectionStart={onSelectionStart}
        onSelectionChange={onSelectionChange}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(instance) => { rfInstanceRef.current = instance; }}
        nodeExtent={[[-5000, -5000], [5000, 5000]]}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{ type: 'btEdge', style: { stroke: '#6888aa', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} color="#334" gap={20} size={1} />
        <Controls style={{ background: '#1e2235', border: '1px solid #334' }} />
        {/* Zoom level indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 5,
            background: '#1e2235',
            border: '1px solid #334',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 12,
            color: '#8899bb',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </div>
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as { colors?: { bg: string } };
            return d.colors?.bg ?? '#333';
          }}
          style={{ background: '#1a1a2e', border: '1px solid #334' }}
        />
      </ReactFlow>

      {/* Unconnected nodes warning */}
      {unconnectedNodes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#1a1a2e',
            border: '1px solid #556',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            color: '#99aacc',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
          title={`Unconnected nodes: ${unconnectedNodes.map((n) => (n.data as { label?: string }).label || n.id).join(', ')}`}
        >
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontWeight: 500 }}>{unconnectedNodes.length} unconnected node{unconnectedNodes.length > 1 ? 's' : ''}</span>
        </div>
      )}

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
          portRemap?: Record<string, string>;
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
            portRemap={data.portRemap}
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

      {/* Keyboard shortcuts help modal */}
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

      {/* Node search modal — press / to open */}
      {showNodeSearch && (
        <NodeSearchModal
          nodes={nodes}
          onSelect={handleNodeSearchSelect}
          onClose={() => setShowNodeSearch(false)}
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
  return edges.map((edge) => {
    // Preserve existing edge data (typeWarning, sourcePort, targetPort, invalid)
    const existingData = edge.data as Record<string, unknown> | undefined;
    const isWarning = !!existingData?.typeWarning;
    const isInvalid = !!existingData?.invalid;

    return {
      ...edge,
      type: 'btEdge',
      selected: edge.id === selectedEdgeId,
      style: {
        stroke: edge.id === selectedEdgeId
          ? '#c8e0ff'
          : isInvalid
          ? '#e04040'
          : isWarning
          ? '#f0a020'
          : '#6888aa',
        strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
      },
      data: {
        ...existingData,
        onDelete: deleteEdge,
      },
    };
  });
}

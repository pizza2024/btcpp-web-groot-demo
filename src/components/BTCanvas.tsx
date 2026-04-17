import React, { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
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

import { useBTStore, useBTStoreApi } from '../store/BTStoreProvider';
import type { BTNodeDefinition, BTProject, BTNodeCategory, BTPort, BTTreeNode } from '../types/bt';
import { treeToFlow, flowToTree, isSameTreeStructure, getDescendantIds, getAttachedNodeIds, getDetachedNodeIds } from '../utils/btFlow';
// Collect all child node IDs (edges) from a tree recursively
function collectEdgeIds(node: BTTreeNode): string[] {
  const ids: string[] = node.children.map((c) => c.id);
  node.children.forEach((child) => {
    ids.push(...collectEdgeIds(child));
  });
  return ids;
}
import { autoLayout } from '../utils/btLayout';
import { isSourceNodeConnectionAllowed } from '../utils/btConnectionRules';
import { validatePortConnection } from '../utils/btXml';
import BTFlowNode from './nodes/BTFlowNode';
import BTFlowEdge from './edges/BTFlowEdge';
import { CATEGORY_COLORS } from '../types/bt-constants';
import { useContextMenu, type MenuConfig, type MenuItem } from './ContextMenu';
import NodePicker from './NodePicker';
import NodeEditModal from './NodeEditModal';
import CdataEditModal from './CdataEditModal';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import NodeSearchModal from './NodeSearchModal';
import TreeTabs from './TreeTabs';
import { useBTEditorIntegration, isIntegrationReadonly } from '../integration/context';
import { addEditorWindowEventListener } from '../integration/editorEvents';

const nodeTypes = { btNode: BTFlowNode };
const edgeTypes = { btEdge: BTFlowEdge };

type BTCanvasProps = {
  sidePanelsCollapsed: boolean;
  onToggleSidePanels: () => void;
  toggleSidePanelsLabel: string;
};

/**
 * Get port definition for a specific port on a node type.
 * Looks in project nodeModels (which already includes builtins for current mode).
 */
function getPortDefinition(
  nodeType: string,
  portName: string,
  nodeModels: BTNodeDefinition[]
): BTPort | undefined {
  const model = nodeModels.find((n) => n.type === nodeType);
  const ports = model?.ports;
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

function getSubTreeTargetFromNodeData(data: { nodeType?: string; label?: string }): string | null {
  if (data.nodeType !== 'SubTree') return null;
  if (!data.label || data.label === 'SubTree') return null;
  return data.label;
}

function collectSubTreeReferences(node: BTTreeNode): string[] {
  const refs: string[] = [];
  const walk = (current: BTTreeNode) => {
    if (current.type === 'SubTree' && current.name) {
      refs.push(current.name);
    }
    current.children.forEach((child) => walk(child));
  };
  walk(node);
  return refs;
}

function buildSubTreeGraph(project: BTProject): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  project.trees.forEach((tree) => {
    graph.set(tree.id, new Set(collectSubTreeReferences(tree.root)));
  });
  return graph;
}

function hasPathBetweenTrees(graph: Map<string, Set<string>>, fromTreeId: string, toTreeId: string): boolean {
  if (fromTreeId === toTreeId) return true;
  const visited = new Set<string>();
  const stack = [fromTreeId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === toTreeId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const nextTargets = graph.get(current);
    if (!nextTargets) continue;
    nextTargets.forEach((nextId) => {
      if (!visited.has(nextId)) stack.push(nextId);
    });
  }

  return false;
}

function isSubTreePreviewNode(node: Node): boolean {
  return (node.data as { isSubTreePreview?: boolean } | undefined)?.isSubTreePreview === true;
}

function isSubTreePreviewEdge(edge: Edge): boolean {
  return (edge.data as { isSubTreePreview?: boolean } | undefined)?.isSubTreePreview === true;
}

function buildFlowNodes(
  treeId: string,
  project: BTProject,
  debugStatuses: Map<string, import('../types/bt').NodeStatus>,
  expandedSubTreeNodeIds: Set<string> = new Set()
): { nodes: Node[]; edges: Edge[] } {
  const tree = project.trees.find((t) => t.id === treeId);
  if (!tree) return { nodes: [], edges: [] };
  const treeById = new Map(project.trees.map((item) => [item.id, item]));
  let { nodes, edges } = treeToFlow(tree, project.nodeModels);
  nodes = autoLayout(nodes, edges);

  const expandedPreviewNodes: Node[] = [];
  const expandedPreviewEdges: Edge[] = [];

  const addExpandedSubTreePreview = (hostNode: Node, targetTreeId: string) => {
    const targetTree = treeById.get(targetTreeId);
    if (!targetTree) return;

    const { nodes: rawSubNodes, edges: rawSubEdges } = treeToFlow(targetTree, project.nodeModels);
    const laidOutSubNodes = autoLayout(rawSubNodes, rawSubEdges);
    const subRoot = laidOutSubNodes.find((n) => {
      const d = n.data as { isRoot?: boolean; nodeType?: string };
      return d.isRoot === true || d.nodeType === 'ROOT';
    });
    if (!subRoot) return;

    // Exclude the ROOT node – connect host directly to ROOT's children for visual continuity
    const subNodesWithoutRoot = laidOutSubNodes.filter((n) => n.id !== subRoot.id);
    const rootChildEdges = rawSubEdges.filter((e) => e.source === subRoot.id);
    const rootChildIds = new Set(rootChildEdges.map((e) => e.target));
    const subEdgesWithoutRoot = rawSubEdges.filter(
      (e) => e.source !== subRoot.id && e.target !== subRoot.id
    );

    // Find the topmost non-root node to anchor the Y offset
    const topNonRootNode = subNodesWithoutRoot.reduce<Node | null>((top, n) => {
      if (!top || n.position.y < top.position.y) return n;
      return top;
    }, null);
    if (!topNonRootNode && subNodesWithoutRoot.length === 0) return;

    const hostWidth = typeof hostNode.width === 'number' ? hostNode.width : 160;
    const subRootWidth = typeof subRoot.width === 'number' ? subRoot.width : 120;
    const hostCenterX = hostNode.position.x + hostWidth / 2;
    const subRootCenterX = subRoot.position.x + subRootWidth / 2;
    const offsetX = hostCenterX - subRootCenterX;
    const topY = topNonRootNode ? topNonRootNode.position.y : subRoot.position.y;
    const offsetY = hostNode.position.y + 100 - topY;

    const idMap = new Map<string, string>();
    laidOutSubNodes.forEach((subNode) => {
      idMap.set(subNode.id, `subexp:${hostNode.id}:${targetTreeId}:${subNode.id}`);
    });

    expandedPreviewNodes.push(
      ...subNodesWithoutRoot.map((subNode) => ({
        ...subNode,
        id: idMap.get(subNode.id) ?? subNode.id,
        position: {
          x: subNode.position.x + offsetX,
          y: subNode.position.y + offsetY,
        },
        draggable: false,
        selectable: false,
        data: {
          ...subNode.data,
          isSubTreePreview: true,
          previewHostSubTreeNodeId: hostNode.id,
          previewTreeId: targetTreeId,
        },
      }))
    );

    expandedPreviewEdges.push(
      ...subEdgesWithoutRoot.map((subEdge, edgeIndex) => ({
        ...subEdge,
        id: `subexp-edge:${hostNode.id}:${targetTreeId}:${edgeIndex}`,
        source: idMap.get(subEdge.source) ?? subEdge.source,
        target: idMap.get(subEdge.target) ?? subEdge.target,
        style: {
          stroke: '#4fa0ff',
          strokeWidth: 1.5,
          strokeDasharray: '4 4',
          opacity: 0.8,
        },
        data: {
          ...subEdge.data,
          isSubTreePreview: true,
          targetStatus: 'IDLE',
        },
      }))
    );

    // Connect host SubTree node directly to each of ROOT's children
    rootChildIds.forEach((childId, idx) => {
      const mappedChildId = idMap.get(childId);
      if (mappedChildId) {
        expandedPreviewEdges.push({
          id: `subexp-link:${hostNode.id}:${targetTreeId}:${idx}`,
          source: hostNode.id,
          target: mappedChildId,
          type: 'btEdge',
          style: {
            stroke: '#7eb5ff',
            strokeWidth: 2,
            strokeDasharray: '6 4',
            opacity: 0.95,
          },
          data: {
            isSubTreePreview: true,
            targetStatus: 'IDLE',
          },
        });
      }
    });
  };

  // Expand only the nodes explicitly toggled by user, including nested SubTrees
  // inside preview content. Each host node is processed once to avoid cyclic
  // references causing infinite rendering.
  const processedExpandedHostIds = new Set<string>();
  let hasNewExpansion = true;

  while (hasNewExpansion) {
    hasNewExpansion = false;
    const candidates = [...nodes, ...expandedPreviewNodes];

    candidates.forEach((node) => {
      if (processedExpandedHostIds.has(node.id)) return;
      if (!expandedSubTreeNodeIds.has(node.id)) return;

      const data = node.data as { nodeType?: string; label?: string };
      const targetTreeId = getSubTreeTargetFromNodeData(data);
      if (!targetTreeId) return;

      processedExpandedHostIds.add(node.id);
      addExpandedSubTreePreview(node, targetTreeId);
      hasNewExpansion = true;
    });
  }

  const allNodes = [...nodes, ...expandedPreviewNodes];
  const allEdges = [...edges, ...expandedPreviewEdges];

  const nodesWithState = allNodes.map((n) => {
    const data = n.data as { nodeType?: string; label?: string; isSubTreePreview?: boolean };
    const targetTreeId = getSubTreeTargetFromNodeData(data);

    return {
      ...n,
      data: {
        ...n.data,
        status: data.isSubTreePreview ? 'IDLE' : (debugStatuses.get(n.id) ?? 'IDLE'),
        isExpandedSubTree: expandedSubTreeNodeIds.has(n.id),
        isSubTreeUnlinked:
          !data.isSubTreePreview
          && data.nodeType === 'SubTree'
          && !targetTreeId,
      },
    };
  });

  const edgesWithState = allEdges.map((e) => ({
    ...e,
    data: {
      ...e.data,
      targetStatus: isSubTreePreviewEdge(e) ? 'IDLE' : (debugStatuses.get(e.target) ?? 'IDLE'),
    },
  }));

  return { nodes: nodesWithState, edges: edgesWithState };
}

function bringNodeToFront(nodes: Node[], nodeId: string): Node[] {
  const targetNode = nodes.find((node) => node.id === nodeId);
  if (!targetNode) return nodes;

  const highestOtherZIndex = nodes.reduce((highest, node) => {
    if (node.id === nodeId) return highest;
    return Math.max(highest, typeof node.zIndex === 'number' ? node.zIndex : 0);
  }, 0);
  const nextZIndex = highestOtherZIndex + 1;

  if (targetNode.zIndex === nextZIndex) return nodes;

  return nodes.map((node) => (node.id === nodeId ? { ...node, zIndex: nextZIndex } : node));
}

function ensureUniqueEdgeIds(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  return edges.map((edge, index) => {
    if (!seen.has(edge.id)) {
      seen.add(edge.id);
      return edge;
    }

    const nextId = `${edge.id}__dup_${index}`;
    seen.add(nextId);
    return { ...edge, id: nextId };
  });
}

const SUBTREE_TARGET_CACHE_KEY = 'bt-editor:last-subtree-target';
const SUBTREE_LOOP_WARNING_MESSAGE = 'One or more SubTrees in this tree reference this SubTree, which may cause an infinite loop. Please check the SubTree references.';

function readCachedSubTreeTarget(
  activeTreeId: string,
  project: BTProject,
  storageAdapter?: { getItem: (key: string) => string | null }
): string | null {
  if (!storageAdapter) return null;
  try {
    const cached = storageAdapter.getItem(SUBTREE_TARGET_CACHE_KEY);
    if (!cached) return null;
    const exists = project.trees.some((tree) => tree.id === cached);
    if (!exists || cached === activeTreeId) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCachedSubTreeTarget(
  treeId: string | undefined,
  storageAdapter?: { setItem: (key: string, value: string) => void }
): void {
  if (!treeId || !storageAdapter) return;
  try {
    storageAdapter.setItem(SUBTREE_TARGET_CACHE_KEY, treeId);
  } catch {
    // Ignore localStorage failures (private mode/quota)
  }
}

const BTCanvas: React.FC<BTCanvasProps> = ({
  sidePanelsCollapsed,
  onToggleSidePanels,
  toggleSidePanelsLabel,
}) => {
  const integration = useBTEditorIntegration();
  const storeApi = useBTStoreApi();
  const {
    project,
    theme,
    activeTreeId,
    setActiveTree,
    selectNode,
    selectedNodeIds,
    clearSelection,
    toggleSelection,
    debugState,
    updateNodeName,
    setLocalCanvas,
    copyNode,
    pasteNode,
    pushHistory,
    collapsedNodeIds,
    toggleNodeCollapse,
    expandedSubTreeNodeIds,
  } = useBTStore();
  const isLightTheme = theme === 'light';
  const readonly = isIntegrationReadonly(integration);
  const treeTabsEnabled = integration?.features.treeTabs ?? true;
  const shortcutsHelpEnabled = integration?.features.shortcutsHelp ?? true;

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMouseClientPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  // Track last pane click for double-click detection
  const lastPaneClickRef = React.useRef<number>(0);

  // Context menu
  const { menuState, showMenu, hideMenu, ContextMenuComponent } = useContextMenu();

  // Node edit modal
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  // CDATA edit modal
  const [editingCdataNodeId, setEditingCdataNodeId] = React.useState<string | null>(null);

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
  const detachedNodeIdsRef = useRef<Set<string>>(new Set());

  // Track if we should force layout (tree switch or initial load)
  const forceLayoutRef = useRef(true);
  // Track the last tree we synced from, to detect real project changes
  const lastSyncedTreeRef = useRef<string | null>(null);
  // Internal save-to-project updates should not immediately rebuild local canvas state.
  const skipNextProjectSyncRef = useRef(false);

  const initial = useMemo(
    () => buildFlowNodes(activeTreeId, project, debugState.nodeStatuses, expandedSubTreeNodeIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTreeId, project, debugState.nodeStatuses, expandedSubTreeNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const expandedSubTreeStateKey = useMemo(
    () => Array.from(expandedSubTreeNodeIds).sort().join('|'),
    [expandedSubTreeNodeIds]
  );
  const lastExpandedSubTreeStateRef = useRef('');

  React.useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  React.useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => {
      const nextEdges = prev.filter((edge) => edge.id !== edgeId);
      detachedNodeIdsRef.current = getDetachedNodeIds(nodesRef.current, nextEdges);
      return nextEdges;
    });
    setSelectedEdgeId((prev) => (prev === edgeId ? null : prev));
  }, [setEdges]);

  // ── Ctrl+Drag Subtree ──────────────────────────────────────────────────────
  // Track Ctrl key state separately via keydown/keyup so we can detect it reliably
  const ctrlKeyRef = useRef(false);
  const shiftKeyRef = useRef(false);
  const [isBoxSelectionEnabled, setIsBoxSelectionEnabled] = React.useState(false);
  const lastSingleSelectedNodeIdRef = useRef<string | null>(null);

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
      if (e.key === 'Shift') {
        shiftKeyRef.current = true;
      }
      if (ctrlKeyRef.current || shiftKeyRef.current) {
        setIsBoxSelectionEnabled(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        ctrlKeyRef.current = false;
      }
      if (e.key === 'Shift') {
        shiftKeyRef.current = false;
      }
      if (!ctrlKeyRef.current && !shiftKeyRef.current) {
        setIsBoxSelectionEnabled(false);
      }
    };
    const handleWindowBlur = () => {
      ctrlKeyRef.current = false;
      shiftKeyRef.current = false;
      setIsBoxSelectionEnabled(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Disable text selection globally while box-selection mode is active so that
  // dragging the selection marquee doesn't accidentally select text outside the canvas.
  React.useEffect(() => {
    if (isBoxSelectionEnabled) {
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.userSelect = '';
    };
  }, [isBoxSelectionEnabled]);

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (readonly) return;
      const useSubtreeDrag = ctrlKeyRef.current || event.altKey;
      if (!useSubtreeDrag) return;
      const descendantIds = getDescendantIds(node.id, edges);
      if (descendantIds.length === 0) return; // No subtree to drag

      // Push history before moving
      storeApi.getState().pushHistory();

      // Get current node positions from store (most up-to-date)
      const currentNodes = storeApi.getState().localNodes;

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
    [edges, readonly]
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
      if (readonly) {
        return;
      }

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
    [onNodesChange, readonly, setNodes]
  );

  // Sync: responds to tree switch and external project changes (like XML load)
  // NOT triggered by our own saveToStore (we use forceLayoutRef for that)
  React.useEffect(() => {
    if (skipNextProjectSyncRef.current) {
      skipNextProjectSyncRef.current = false;
      lastSyncedTreeRef.current = activeTreeId;
      forceLayoutRef.current = false;
      lastExpandedSubTreeStateRef.current = expandedSubTreeStateKey;
      return;
    }

    const previousTreeId = lastSyncedTreeRef.current;
    if (previousTreeId && previousTreeId !== activeTreeId) {
      const pendingTimerId = saveTimersRef.current.get(previousTreeId);
      if (pendingTimerId) {
        window.clearTimeout(pendingTimerId);
        saveTimersRef.current.delete(previousTreeId);
      }
      persistTreeSnapshot(nodesRef.current, edgesRef.current, previousTreeId);
    }

    // Force layout when switching trees or first load OR when project changed (e.g., loaded new XML)
    const { localNodes: storeLocalNodes, localEdges: storeLocalEdges } = storeApi.getState();
    const isTreeSwitch = lastSyncedTreeRef.current !== null && lastSyncedTreeRef.current !== activeTreeId;
    const hasExpandedStateChanged = lastExpandedSubTreeStateRef.current !== expandedSubTreeStateKey;
    const shouldForceLayout =
      forceLayoutRef.current
      || lastSyncedTreeRef.current !== activeTreeId
      || hasExpandedStateChanged
      || (storeLocalNodes.length === 0 && storeLocalEdges.length === 0);
    if (shouldForceLayout) {
      // Full rebuild with autoLayout for tree switch or initial load
      const { nodes: n, edges: e } = buildFlowNodes(activeTreeId, project, debugState.nodeStatuses, storeApi.getState().expandedSubTreeNodeIds);
      // Apply collapsed filter
      const collapsed = storeApi.getState().collapsedNodeIds;
      const collapsedDescendants = new Set<string>();
      e.forEach((edge) => {
        if (collapsed.has(edge.source)) {
          // source is collapsed, mark all its descendants
          const desc = getDescendantIds(edge.source, e);
          desc.forEach(d => collapsedDescendants.add(d));
        }
      });
      setNodes((prevNodes) => {
        const existingZIndexes = new Map(prevNodes.map((node) => [node.id, node.zIndex]));
        const rebuilt = n.map((node) => ({
          ...node,
          hidden: collapsedDescendants.has(node.id),
          zIndex: existingZIndexes.get(node.id) ?? node.zIndex,
          data: { ...node.data, isCollapsed: collapsed.has(node.id) },
        }));

        if (isTreeSwitch) {
          detachedNodeIdsRef.current = new Set();
          return rebuilt;
        }

        // Keep detached nodes on canvas even when force-rebuilding from project tree.
        const attachedIds = new Set(rebuilt.map((node) => node.id));
        const detachedToRestore = prevNodes.filter((node) => detachedNodeIdsRef.current.has(node.id) && !attachedIds.has(node.id));
        return [...rebuilt, ...detachedToRestore];
      });
      setEdges((prevEdges) => {
        if (isTreeSwitch) {
          return withSelectedEdge(ensureUniqueEdgeIds([...e]), selectedEdgeId, deleteEdge);
        }

        const attachedIds = new Set(n.map((node) => node.id));
        const detachedEdgesToRestore = prevEdges.filter((edge) => !attachedIds.has(edge.source) && !attachedIds.has(edge.target));
        return withSelectedEdge(ensureUniqueEdgeIds([...e, ...detachedEdgesToRestore]), selectedEdgeId, deleteEdge);
      });
      lastSyncedTreeRef.current = activeTreeId;
      forceLayoutRef.current = false;
      lastExpandedSubTreeStateRef.current = expandedSubTreeStateKey;
    } else {
      // Incremental update: only sync structure from project, preserve existing positions
      const tree = project.trees.find((t) => t.id === activeTreeId);
      if (!tree) return;
      const { nodes: newNodes, edges: newEdges } = treeToFlow(tree, project.nodeModels);

      // Apply autoLayout to properly position all nodes
      const laidOutNodes = autoLayout(newNodes, newEdges);

      // Apply collapsed filter
      const collapsed = storeApi.getState().collapsedNodeIds;
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
        const existingZIndexes = new Map(prevNodes.map((n) => [n.id, n.zIndex]));
        const merged = laidOutNodes.map((n) => ({
          ...n,
          hidden: collapsedDescendants.has(n.id),
          position: existingPositions.get(n.id) ?? n.position,
          zIndex: existingZIndexes.get(n.id) ?? n.zIndex,
          selected: selectedNodeIds.has(n.id),
          data: {
            ...n.data,
            isCollapsed: collapsed.has(n.id),
            status: debugState.nodeStatuses.get(n.id) ?? 'IDLE',
          },
        }));

        // Add back detached (orphan) nodes - they should stay on canvas even after project sync
        const attachedIds = new Set(laidOutNodes.map((n) => n.id));
        const detachedToRestore = prevNodes.filter((n) => detachedNodeIdsRef.current.has(n.id) && !attachedIds.has(n.id));
        return [...merged, ...detachedToRestore];
      });
      // Inject target node status into edges for RUNNING animation
      const edgesWithStatus = newEdges.map((e) => ({
        ...e,
        data: { ...e.data, targetStatus: debugState.nodeStatuses.get(e.target) ?? 'IDLE' },
      }));
      setEdges((prevEdges) => {
        const attachedIds = new Set(laidOutNodes.map((node) => node.id));
        const detachedEdgesToRestore = prevEdges.filter((edge) => !attachedIds.has(edge.source) && !attachedIds.has(edge.target));
        return withSelectedEdge(ensureUniqueEdgeIds([...edgesWithStatus, ...detachedEdgesToRestore]), selectedEdgeId, deleteEdge);
      });
      lastExpandedSubTreeStateRef.current = expandedSubTreeStateKey;
    }
  }, [activeTreeId, project, debugState.nodeStatuses, selectedEdgeId, deleteEdge, collapsedNodeIds, expandedSubTreeStateKey]);

  // Highlight selected nodes
  React.useEffect(() => {
    const singleSelectedNodeId = selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null;

    setNodes((prev) => {
      const withSelectionState = prev.map((n) => ({
        ...n,
        selected: selectedNodeIds.has(n.id),
      }));

      if (singleSelectedNodeId) {
        return bringNodeToFront(withSelectionState, singleSelectedNodeId);
      }

      const lastSingleSelectedNodeId = lastSingleSelectedNodeIdRef.current;
      if (lastSingleSelectedNodeId) {
        return bringNodeToFront(withSelectionState, lastSingleSelectedNodeId);
      }

      return withSelectionState;
    });

    lastSingleSelectedNodeIdRef.current = singleSelectedNodeId;
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
      if (readonly) return;
      if (!nodePickerPosition) return;

      // Find the source node that was being connected from
      // We need to get this from the pending connection state
      // For now, we'll use the first selected node or find a better way
      const sourceNodeId = pendingConnection?.sourceNodeId;
      if (!sourceNodeId) {
        setNodePickerPosition(null);
        setPendingConnection(null);
        return;
      }

      // NodePicker only supports creating children from source handles.
      if (pendingConnection?.sourceHandleType !== 'source') {
        setNodePickerPosition(null);
        setPendingConnection(null);
        return;
      }

      // Apply the same source-side connection rules as normal drag-to-node connect.
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode || !isSourceNodeConnectionAllowed(sourceNode, edges)) {
        setNodePickerPosition(null);
        setPendingConnection(null);
        return;
      }

      // Create new node at picker position
      const newNodeId = `n_${Math.random().toString(36).slice(2, 9)}`;
      // Ensure category is valid key in CATEGORY_COLORS
      const validCategory = category && category in CATEGORY_COLORS ? category : 'Control';
      const colors = CATEGORY_COLORS[validCategory] ?? CATEGORY_COLORS.Control;
      const isLeaf = category === 'Action' || category === 'Condition' || category === 'SubTree';
      const isSubTreeNode = nodeType === 'SubTree';
      const cachedSubTreeTarget = isSubTreeNode
        ? readCachedSubTreeTarget(activeTreeId, project, integration?.adapters.storageAdapter)
        : null;
      const resolvedLabel = cachedSubTreeTarget ?? nodeType;

      const newNode: Node = {
        id: newNodeId,
        type: 'btNode',
        position: { x: nodePickerPosition.flowX, y: nodePickerPosition.flowY },
        data: {
          label: resolvedLabel,
          nodeType,
          category,
          colors,
          ports: {},
          childrenCount: isLeaf ? 0 : 1,
          isSubTreeUnlinked: isSubTreeNode && !cachedSubTreeTarget,
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
    [activeTreeId, project, nodePickerPosition, pendingConnection, readonly, setNodes, setEdges, deleteEdge, nodes, edges]
  );

  // Validate connection based on BT rules
  const isValidConnection = useCallback(
    (sourceNode: Node, existingEdges: Edge[]): boolean => {
      return isSourceNodeConnectionAllowed(sourceNode, existingEdges);
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (readonly) {
        return;
      }

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

      storeApi.getState().pushHistory();
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
    [deleteEdge, setEdges, nodes, edges, isValidConnection, project.nodeModels, debugState.nodeStatuses, readonly]
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

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    lastMouseClientPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const getPasteFlowPosition = useCallback((clientPosition?: { x: number; y: number }) => {
    const rfInstance = rfInstanceRef.current;
    if (!rfInstance) return undefined;

    const pointer = clientPosition ?? lastMouseClientPositionRef.current;
    if (!pointer) return undefined;

    return rfInstance.screenToFlowPosition(pointer);
  }, []);

  const pasteClipboardNode = useCallback(
    (clientPosition?: { x: number; y: number }) => {
      if (readonly) return null;
      const newNode = pasteNode(getPasteFlowPosition(clientPosition));
      if (!newNode) return null;

      pushHistory();
      setNodes((prev) => [...prev, newNode]);
      setSelectedEdgeId(null);
      selectNode(newNode.id);
      return newNode;
    },
    [getPasteFlowPosition, pasteNode, pushHistory, readonly, selectNode, setNodes]
  );

  const syncZoomLevel = useCallback((nextZoom: number) => {
    if (!Number.isFinite(nextZoom)) return;
    setZoomLevel((prev) => (Math.abs(prev - nextZoom) < 0.0001 ? prev : nextZoom));
  }, []);

  const beautifyLayout = useCallback(() => {
    if (readonly) return;
    storeApi.getState().pushHistory();
    const currentNodes = nodesRef.current;
    const attachedIds = getAttachedNodeIds(currentNodes, edges);
    const attachedNodes = currentNodes.filter((node) => attachedIds.has(node.id));
    const attachedEdges = edges.filter((edge) => attachedIds.has(edge.source) && attachedIds.has(edge.target));
    const laidOutAttachedNodes = autoLayout(attachedNodes, attachedEdges);
    const laidOutAttachedNodeMap = new Map(laidOutAttachedNodes.map((node) => [node.id, node]));

    setNodes((prev) => prev.map((node) => laidOutAttachedNodeMap.get(node.id) ?? node));

    if (laidOutAttachedNodes.length === 0) return;

    const incomingCounts = new Map<string, number>();
    laidOutAttachedNodes.forEach((node) => incomingCounts.set(node.id, 0));
    attachedEdges.forEach((edge) => {
      incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
    });

    const layoutNodeById = new Map(laidOutAttachedNodes.map((node) => [node.id, node]));
    const rootNode = laidOutAttachedNodes.find((node) => {
      const data = node.data as { isRoot?: boolean } | undefined;
      return data?.isRoot === true;
    }) ?? laidOutAttachedNodes.find((node) => (incomingCounts.get(node.id) ?? 0) === 0);

    let anchorNode = rootNode;
    if (rootNode) {
      const directChildren = attachedEdges
        .filter((edge) => edge.source === rootNode.id)
        .map((edge) => layoutNodeById.get(edge.target))
        .filter((node): node is Node => Boolean(node));
      if (directChildren.length === 1) {
        anchorNode = directChildren[0];
      }
    }

    requestAnimationFrame(() => {
      const instance = rfInstanceRef.current;
      const container = canvasContainerRef.current;
      if (!instance || !container || !anchorNode) return;

      const viewport = instance.getViewport();
      const anchorWidth = typeof anchorNode.width === 'number' ? anchorNode.width : 200;
      const anchorCenterX = anchorNode.position.x + anchorWidth / 2;
      const nextViewportX = container.clientWidth / 2 - anchorCenterX * viewport.zoom;

      instance.setViewport({
        x: nextViewportX,
        y: viewport.y,
        zoom: viewport.zoom,
      }, { duration: 250 });
    });
  }, [edges, readonly, setNodes, storeApi]);

  const onMove = useCallback((_: MouseEvent | TouchEvent | null, viewport: { zoom: number }) => {
    syncZoomLevel(viewport.zoom);
  }, [syncZoomLevel]);

  const onPaneClick = useCallback(() => {
    // Detect double-click on pane to reset zoom
    const now = Date.now();
    if (now - lastPaneClickRef.current < 300) {
      // Double-click detected - reset zoom to fit view
      rfInstanceRef.current?.fitView({ duration: 300 });
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
      if (!selectedNodeIds.has(node.id)) {
        selectNode(node.id);
      }
      showMenu(event, 'node', node.id);
    },
    [showMenu, selectedNodeIds, selectNode]
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
      // Exclude ROOT nodes from drag-box selection.
      const selectedIds = new Set(
        params.nodes
          .filter((n) => ((n.data as { isRoot?: boolean } | undefined)?.isRoot !== true))
          .map((n) => n.id)
      );
      // Replace the entire selection with the dragged selection
      storeApi.getState().setSelectedNodes(selectedIds);
    },
    []
  );

  const onCanvasContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Fallback guard: some selection overlays may bypass pane context handler.
    if (selectedNodeIds.size > 1) {
      event.preventDefault();
      showMenu(event, 'pane', null);
    }
  }, [selectedNodeIds.size, showMenu]);

  // Save tree back to store when nodes/edges change (debounced)
  // This does NOT trigger the sync effect - they're decoupled
  const saveTimersRef = useRef<Map<string, number>>(new Map());

  React.useEffect(() => {
    const saveTimers = saveTimersRef.current;
    return () => {
      saveTimers.forEach((timerId) => window.clearTimeout(timerId));
      saveTimers.clear();
    };
  }, []);

  function persistTreeSnapshot(nodesSnapshot: Node[], edgesSnapshot: Edge[], treeIdSnapshot: string) {
    try {
      const { project: p } = storeApi.getState();

      // Tree might have been removed/renamed while debounce timer was pending.
      if (!p.trees.some((tree) => tree.id === treeIdSnapshot)) {
        return;
      }

      const persistentNodes = nodesSnapshot.filter((node) => !isSubTreePreviewNode(node));
      const persistentNodeIds = new Set(persistentNodes.map((node) => node.id));
      const persistentEdges = edgesSnapshot.filter((edge) => {
        if (isSubTreePreviewEdge(edge)) return false;
        return persistentNodeIds.has(edge.source) && persistentNodeIds.has(edge.target);
      });

      // Keep only nodes reachable from ROOT when persisting tree structure.
      // Non-reachable nodes are tracked as detached and kept on canvas.
      const attachedIds = getAttachedNodeIds(persistentNodes, persistentEdges);
      const nextDetachedIds = getDetachedNodeIds(persistentNodes, persistentEdges);
      detachedNodeIdsRef.current = nextDetachedIds;

      const attachedNodes = persistentNodes.filter((n) => attachedIds.has(n.id));
      const attachedEdges = persistentEdges.filter(
        (e) => attachedIds.has(e.source) && attachedIds.has(e.target)
      );
      const tree = flowToTree(treeIdSnapshot, attachedNodes, attachedEdges);
      const currentTree = p.trees.find((t) => t.id === treeIdSnapshot);

      // Only skip save if node structure unchanged AND edges unchanged.
      // isSameTreeStructure checks node IDs/types/ports/children, but not edge identity.
      // Edge identity = which specific child IDs each parent has.
      // If edge IDs differ, the tree must be re-saved even if child count is same.
      const currentEdgeIds = currentTree ? collectEdgeIds(currentTree.root) : [];
      const newEdgeIds = collectEdgeIds(tree.root);
      const edgesUnchanged = currentTree && isSameTreeStructure(currentTree, tree) && JSON.stringify(currentEdgeIds) === JSON.stringify(newEdgeIds);
      if (edgesUnchanged) return;

      const trees = p.trees.map((t) => (t.id === treeIdSnapshot ? tree : t));
      skipNextProjectSyncRef.current = true;
      storeApi.setState({ project: { ...p, trees } });
    } catch {
      // ignore intermediate invalid states
    }
  }

  const saveToStore = useCallback((nodesSnapshot: Node[], edgesSnapshot: Edge[], treeIdSnapshot: string) => {
    const existingTimerId = saveTimersRef.current.get(treeIdSnapshot);
    if (existingTimerId) {
      window.clearTimeout(existingTimerId);
    }

    const timerId = window.setTimeout(() => {
      try {
        persistTreeSnapshot(nodesSnapshot, edgesSnapshot, treeIdSnapshot);
      } finally {
        saveTimersRef.current.delete(treeIdSnapshot);
      }
    }, 500);

    saveTimersRef.current.set(treeIdSnapshot, timerId);
  }, []);

  React.useEffect(() => {
    saveToStore(nodes, edges, activeTreeId);
  }, [nodes, edges, activeTreeId, saveToStore]);

  // Immediately sync localNodes/localEdges to store for lookup (not debounced)
  React.useEffect(() => {
    const persistentNodes = nodes.filter((node) => !isSubTreePreviewNode(node));
    const persistentNodeIds = new Set(persistentNodes.map((node) => node.id));
    const persistentEdges = edges.filter((edge) => !isSubTreePreviewEdge(edge) && persistentNodeIds.has(edge.source) && persistentNodeIds.has(edge.target));
    setLocalCanvas(persistentNodes, persistentEdges);
  }, [nodes, edges, setLocalCanvas]);

  // When PropertiesPanel saves (updates localNodes), sync to ReactFlow nodes
  // This handles Apply button for port values, name changes, etc.
  React.useEffect(() => {
    const handleNodesUpdated = () => {
      // Read fresh localNodes from store and update ReactFlow's nodes state
      const { localNodes: freshNodes } = storeApi.getState();
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

    return addEditorWindowEventListener('bt-nodes-updated', handleNodesUpdated);
  }, [setNodes]);

  // Handle node edit modal trigger
  React.useEffect(() => {
    const handleNodeEdit = (customEvent: CustomEvent<{ nodeId: string }>) => {
      setEditingNodeId(customEvent.detail.nodeId);
    };

    return addEditorWindowEventListener('bt-node-edit', handleNodeEdit);
  }, []);

  React.useEffect(() => {
    const handleToggleExpandSubTree = (customEvent: CustomEvent<{ nodeId: string }>) => {
      const node = nodes.find((item) => item.id === customEvent.detail.nodeId);
      if (!node) return;

      const data = node.data as { nodeType?: string; label?: string };
      const targetTreeId = getSubTreeTargetFromNodeData(data);
      if (!targetTreeId) return;

      storeApi.getState().toggleExpandSubTree(customEvent.detail.nodeId);
    };

    const handleOpenSubTree = (customEvent: CustomEvent<{ nodeId: string }>) => {
      const node = nodes.find((item) => item.id === customEvent.detail.nodeId);
      if (!node) return;

      const data = node.data as { nodeType?: string; label?: string };
      if (data.nodeType !== 'SubTree' || !data.label) return;

      const targetTree = project.trees.find((tree) => tree.id === data.label);
      if (!targetTree || targetTree.id === activeTreeId) return;

      setActiveTree(targetTree.id);
      setSelectedEdgeId(null);
      clearSelection();
      hideMenu();
    };

    const disposeToggle = addEditorWindowEventListener('bt-toggle-expand-subtree', handleToggleExpandSubTree);
    const disposeOpen = addEditorWindowEventListener('bt-open-subtree', handleOpenSubTree);
    return () => {
      disposeToggle();
      disposeOpen();
    };
  }, [nodes, project, project.trees, activeTreeId, setActiveTree, clearSelection, hideMenu]);

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
        link.download = `${storeApi.getState().activeTreeId || 'behavior-tree'}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        integration?.adapters.loggerAdapter.error('Failed to export PNG:', err);
      }
    };

    return addEditorWindowEventListener('bt-export-png', handleExportPNG);
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
    if (readonly) return;
    if (!editingNodeId) return;

    // Get current node data for SubTree autoremap check
    const editingNode = nodes.find((n) => n.id === editingNodeId);
    const editingNodeData = editingNode?.data as {
      nodeType: string;
      label: string;
      ports?: Record<string, string>;
      preconditions?: Record<string, string>;
      postconditions?: Record<string, string>;
      description?: string;
      portRemap?: Record<string, string>;
    } | undefined;

    // F1.5: Auto-remap SubTree ports when __autoremap is enabled
    let computedPortRemap = data.portRemap;
    if (
      editingNodeData?.nodeType === 'SubTree' &&
      data.ports['__autoremap'] === 'true'
    ) {
      const { project } = storeApi.getState();
      const referencedTreeId = data.name;
      const referencedTree = project.trees.find((t) => t.id === referencedTreeId);
      if (referencedTree) {
        // Get external ports from the referenced tree's root
        const externalPorts = referencedTree.root.ports ?? {};
        // Auto-remap: for each local port (except __autoremap), map to same name on external
        const autoRemap: Record<string, string> = {};
        Object.keys(data.ports).forEach((portName) => {
          if (portName !== '__autoremap') {
            // Map to same name on external tree
            autoRemap[portName] = portName;
          }
        });
        // Only use auto-remap if external ports exist and match
        const hasExternalPorts = Object.keys(externalPorts).length > 0;
        if (hasExternalPorts || Object.keys(autoRemap).length > 0) {
          computedPortRemap = autoRemap;
        }
      }
    }

    // Update local nodes state for immediate UI feedback
    setNodes((prev) => {
      const node = prev.find((n) => n.id === editingNodeId);
      const nodeData = editingNodeData;
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
              portRemap: computedPortRemap,
              isSubTreeUnlinked:
                nodeData.nodeType === 'SubTree'
                && (!data.name || data.name === 'SubTree'),
            },
          };
        }
        return n;
      });
    });

    // Update store for persistence
    if (data.name !== undefined) {
      updateNodeName(editingNodeId, data.name);
      if (editingNodeData?.nodeType === 'SubTree' && data.name && data.name !== 'SubTree') {
        writeCachedSubTreeTarget(data.name, integration?.adapters.storageAdapter);
      }
    }
    if (data.ports !== undefined) {
      const { updateNodePorts } = storeApi.getState();
      updateNodePorts(editingNodeId, data.ports);
    }
    if (data.preconditions !== undefined || data.postconditions !== undefined) {
      const { updateNodeConditions } = storeApi.getState();
      updateNodeConditions(editingNodeId, data.preconditions, data.postconditions);
    }
    if (computedPortRemap !== undefined) {
      const { updateNodePortRemap } = storeApi.getState();
      updateNodePortRemap(editingNodeId, computedPortRemap);
    }
  }, [editingNodeId, readonly, setNodes, updateNodeName, nodes]);

  // Handle CDATA edit modal save
  const handleCdataSave = useCallback((cdata: string | undefined) => {
    if (readonly) return;
    if (!editingCdataNodeId) return;
    storeApi.getState().pushHistory();
    storeApi.getState().updateNodeCdata(editingCdataNodeId, cdata);
    // Update local node data for immediate UI feedback
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === editingCdataNodeId) {
          return { ...n, data: { ...n.data, cdata } };
        }
        return n;
      })
    );
    setEditingCdataNodeId(null);
  }, [editingCdataNodeId, readonly, setNodes]);

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
        if (readonly) return;
        event.preventDefault();
        if (selectedNodeIds.size > 0) {
          // Protect ROOT: never allow ROOT to be deleted via keyboard
          const { localNodes } = storeApi.getState();
          const rootIds = new Set(localNodes.filter((n) => (n.data as { isRoot?: boolean }).isRoot).map((n) => n.id));
          const idsToDelete = new Set([...selectedNodeIds].filter((id) => !rootIds.has(id)));
          if (idsToDelete.size === 0) return; // Only ROOT was selected, do nothing

          storeApi.getState().pushHistory();
          setNodes((prev) => prev.filter((n) => !idsToDelete.has(n.id)));
          setEdges((prev) => prev.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)));
          const nextDetached = new Set(detachedNodeIdsRef.current);
          idsToDelete.forEach((id) => nextDetached.delete(id));
          detachedNodeIdsRef.current = nextDetached;
          clearSelection();
        } else if (selectedEdgeId) {
          storeApi.getState().pushHistory();
          deleteEdge(selectedEdgeId);
        }
        return;
      }

      // Ctrl+Z: Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        if (readonly) return;
        event.preventDefault();
        storeApi.getState().undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        if (readonly) return;
        event.preventDefault();
        storeApi.getState().redo();
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
        if (!shortcutsHelpEnabled) return;
        event.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Ctrl+A: Select all nodes
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        const allIds = new Set(nodes.filter((n) => !isSubTreePreviewNode(n)).map((n) => n.id));
        storeApi.getState().clearSelection();
        allIds.forEach((id) => storeApi.getState().addToSelection(id));
        return;
      }

      // Arrow keys: nudge selected nodes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && selectedNodeIds.size > 0) {
        if (readonly) return;
        // Only nudge when not in an input field and no modifier keys (except shift for larger nudge)
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        event.preventDefault();
        const step = event.shiftKey ? 20 : 5;
        let dx = 0, dy = 0;
        if (event.key === 'ArrowUp') dy = -step;
        if (event.key === 'ArrowDown') dy = step;
        if (event.key === 'ArrowLeft') dx = -step;
        if (event.key === 'ArrowRight') dx = step;
        storeApi.getState().pushHistory();
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
        if (readonly) return;
        event.preventDefault();
        pasteClipboardNode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteEdge, selectNode, clearSelection, selectedEdgeId, selectedNodeIds, nodes, copyNode, pasteClipboardNode, pushHistory, showHelp, setShowHelp, showNodeSearch, setShowNodeSearch, readonly, shortcutsHelpEnabled]);

  // Handle toolbar help button
  React.useEffect(() => {
    if (!shortcutsHelpEnabled) {
      return;
    }
    const handleToggleHelp = () => setShowHelp((prev) => !prev);
    return addEditorWindowEventListener('bt-toggle-shortcuts-help', handleToggleHelp);
  }, [shortcutsHelpEnabled]);

  // Drag-over handler for dropping from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const types = Array.from(event.dataTransfer.types);
    const isFavoriteTemplateDrag = types.includes('application/bt-template');
    event.dataTransfer.dropEffect = isFavoriteTemplateDrag ? 'copy' : 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readonly) {
        return;
      }

      event.preventDefault();

      // Check for favorite template drop first
      const templateData = event.dataTransfer.getData('application/bt-template');
      if (templateData && rfInstanceRef.current) {
        try {
          const template = JSON.parse(templateData) as {
            name?: string;
            type: string;
            category?: string;
            ports?: Record<string, string>;
            preconditions?: Record<string, string>;
            postconditions?: Record<string, string>;
            subtree?: {
              rootId: string;
              nodes: Array<{
                id: string;
                position: { x: number; y: number };
                data: {
                  label?: string;
                  nodeType: string;
                  category: string;
                  colors?: { bg: string; border: string; text: string };
                  ports?: Record<string, string>;
                  preconditions?: Record<string, string>;
                  postconditions?: Record<string, string>;
                  childrenCount?: number;
                  description?: string;
                  cdata?: string;
                };
              }>;
              edges: Array<{
                source: string;
                target: string;
                sourceHandle?: string | null;
                targetHandle?: string | null;
              }>;
            };
          };
          const position = rfInstanceRef.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          if (template.subtree && template.subtree.nodes.length > 0) {
            const rootTemplateNode = template.subtree.nodes.find((n) => n.id === template.subtree!.rootId);
            const anchor = rootTemplateNode?.position ?? template.subtree.nodes[0].position;
            const dx = position.x - anchor.x;
            const dy = position.y - anchor.y;

            const idMap = new Map<string, string>();
            template.subtree.nodes.forEach((n) => {
              idMap.set(n.id, `n_${Math.random().toString(36).slice(2, 9)}`);
            });

            const clonedNodes: Node[] = template.subtree.nodes.map((n) => {
              const category = n.data.category || 'Action';
              const colors = n.data.colors ?? (CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Action);
              return {
                id: idMap.get(n.id)!,
                type: 'btNode',
                position: { x: n.position.x + dx, y: n.position.y + dy },
                data: {
                  label: n.data.label || n.data.nodeType,
                  nodeType: n.data.nodeType,
                  category,
                  colors,
                  ports: n.data.ports ?? {},
                  preconditions: n.data.preconditions,
                  postconditions: n.data.postconditions,
                  childrenCount: n.data.childrenCount ?? 0,
                  description: n.data.description,
                  cdata: n.data.cdata,
                },
              };
            });

            const clonedEdges: Edge[] = template.subtree.edges
              .map((e) => {
                const source = idMap.get(e.source);
                const target = idMap.get(e.target);
                if (!source || !target) return null;
                return {
                  id: `e_${Math.random().toString(36).slice(2, 9)}`,
                  source,
                  target,
                  sourceHandle: e.sourceHandle ?? undefined,
                  targetHandle: e.targetHandle ?? undefined,
                  type: 'btEdge',
                  style: { stroke: '#6888aa', strokeWidth: 2 },
                } as Edge;
              })
              .filter((e): e is Edge => Boolean(e));

            storeApi.getState().pushHistory();
            setNodes((nds) => [...nds, ...clonedNodes]);
            setEdges((eds) => withSelectedEdge([...eds, ...clonedEdges], null, deleteEdge));
            setSelectedEdgeId(null);
            return;
          }

          const def: BTNodeDefinition | undefined = project.nodeModels.find((m) => m.type === template.type);
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

          storeApi.getState().pushHistory();
          setNodes((nds) => [...nds, newNode]);
          setSelectedEdgeId(null);
          return;
        } catch (error) {
          integration?.adapters.loggerAdapter.error('Failed to parse favorite template:', error);
          // Fall through to handle as regular node type
        }
      }

      // Handle regular node type drop
      const nodeType = event.dataTransfer.getData('application/btnode-type');
      const subtreeTarget = event.dataTransfer.getData('application/bt-subtree-target') || null;
      if (!nodeType || !rfInstanceRef.current) return;

      const position = rfInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const def: BTNodeDefinition | undefined = project.nodeModels.find((m) => m.type === nodeType);
      const category = def?.category ?? 'Action';
      const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Action'];
      const isSubTreeNode = nodeType === 'SubTree';
      const cachedSubTreeTarget = isSubTreeNode
        ? readCachedSubTreeTarget(activeTreeId, project, integration?.adapters.storageAdapter)
        : null;
      const resolvedLabel = subtreeTarget ?? cachedSubTreeTarget ?? nodeType;

      const newNode: Node = {
        id: `n_${Math.random().toString(36).slice(2, 9)}`,
        type: 'btNode',
        position,
        data: {
          label: resolvedLabel,
          nodeType,
          category,
          colors,
          ports: {},
          childrenCount: 0,
          isSubTreeUnlinked: isSubTreeNode && !subtreeTarget && !cachedSubTreeTarget,
        },
      };

      // If it's a custom leaf node not yet in node models, auto-add
      if (!project.nodeModels.find((m) => m.type === nodeType)) {
        storeApi.getState().pushHistory();
        integration?.modelActions.addNodeModel({ type: nodeType, category }, 'user');
      } else {
        storeApi.getState().pushHistory();
      }

      setNodes((nds) => [...nds, newNode]);
      setSelectedEdgeId(null);
    },
    [activeTreeId, integration, project, readonly, setNodes]
  );

  // Check for nodes that should trigger disconnected warning.
  // Includes two cases:
  // 1) Nodes not connected to the ROOT-attached graph.
  // 2) Control nodes with no child edge (special invalid case aligned with Groot2 behavior).
  const subTreeGraph = useMemo(() => buildSubTreeGraph(project), [project]);

  const hasSubTreeLoopWarning = useMemo(() => {
    const activeTree = project.trees.find((tree) => tree.id === activeTreeId);
    if (!activeTree) return false;

    const refs = collectSubTreeReferences(activeTree.root);
    return refs.some((targetTreeId) => hasPathBetweenTrees(subTreeGraph, targetTreeId, activeTreeId));
  }, [project.trees, activeTreeId, subTreeGraph]);

  const disconnectedNodes = useMemo(() => {
    const persistentNodes = nodes.filter((node) => !isSubTreePreviewNode(node));
    const persistentEdges = edges.filter((edge) => !isSubTreePreviewEdge(edge));
    if (persistentNodes.length === 0) return [];

    const attachedIds = getAttachedNodeIds(persistentNodes, persistentEdges);
    const outgoingCountBySource = new Map<string, number>();
    persistentEdges.forEach((edge) => {
      outgoingCountBySource.set(edge.source, (outgoingCountBySource.get(edge.source) ?? 0) + 1);
    });

    return persistentNodes.filter((n) => {
      // Skip ROOT - it doesn't need connections
      const data = n.data as { isRoot?: boolean; category?: string };
      if (data?.isRoot) return false;

      const isDetachedFromRoot = !attachedIds.has(n.id);
      const isControlLeaf = data?.category === 'Control' && (outgoingCountBySource.get(n.id) ?? 0) === 0;

      return isDetachedFromRoot || isControlLeaf;
    });
  }, [nodes, edges]);

  // Build dynamic menu config based on current context
  const dynamicMenuConfig: MenuConfig = useMemo(() => {
    const targetNodeId = menuState.targetId;
    const targetNode = targetNodeId ? nodes.find((n) => n.id === targetNodeId) : null;
    const targetData = targetNode?.data as {
      isRoot?: boolean;
      isSubTreePreview?: boolean;
      nodeType?: string;
      label?: string;
      ports?: Record<string, string>;
      category?: string;
      preconditions?: Record<string, string>;
      postconditions?: Record<string, string>;
      description?: string;
      childrenCount?: number;
      isCollapsed?: boolean;
    } | undefined;
    const isRoot = targetData?.isRoot === true;
    const isPreviewNode = targetData?.isSubTreePreview === true;
    const hasChildren = (targetData?.childrenCount ?? 0) > 0;
    const isSubTreeNode = targetData?.nodeType === 'SubTree';
    const referencedTreeId = isSubTreeNode ? targetData?.label : undefined;
    const referencedTreeExists = referencedTreeId
      ? project.trees.some((tree) => tree.id === referencedTreeId && tree.id !== activeTreeId)
      : false;
    // Read collapsed state from store (authoritative)
    const collapsedSet = storeApi.getState().collapsedNodeIds;
    const isCollapsed = targetNodeId ? collapsedSet.has(targetNodeId) : false;

    return {
      edge: menuState.targetType === 'edge' && menuState.targetId ? [
        {
          id: 'delete',
          label: 'Delete Edge',
          icon: '🗑️',
          danger: true,
          disabled: readonly,
          action: () => {
            if (readonly) return;
            storeApi.getState().pushHistory();
            deleteEdge(menuState.targetId!);
          },
        },
      ] : [],
      node: menuState.targetType === 'node' && menuState.targetId && !isRoot && !isPreviewNode ? [
        {
          id: 'copy',
          label: 'Copy Node',
          icon: '📋',
          action: () => {
            // Prefer the current target node from this render; fallback to store lookup.
            const nodeToCopy = targetNode
              ?? (targetNodeId
                ? (storeApi.getState().localNodes.find((n) => n.id === targetNodeId) ?? null)
                : null);
            if (nodeToCopy) {
              copyNode(nodeToCopy);
            }
          },
        },
        {
          id: 'delete',
          label: 'Delete Node',
          icon: '🗑️',
          danger: true,
          disabled: readonly,
          action: () => {
            if (readonly) return;
            if (!menuState.targetId) return;
            storeApi.getState().pushHistory();
            const deletedId = menuState.targetId;
            setNodes((prev) => prev.filter((n) => n.id !== deletedId));
            setEdges((prev) => prev.filter((e) => e.source !== deletedId && e.target !== deletedId));
            // Remove from detached set if it was tracked as orphan
            const nextDetached = new Set(detachedNodeIdsRef.current);
            nextDetached.delete(deletedId);
            detachedNodeIdsRef.current = nextDetached;
          },
        },
        ...(hasChildren ? [{
          id: 'delete-subtree',
          label: 'Delete Subtree',
          icon: '🗑️',
          danger: true,
          disabled: readonly,
          action: () => {
            if (readonly) return;
            if (!menuState.targetId) return;
            // Get all descendant node IDs (subtree)
            const subtreeNodeIds = new Set<string>();
            subtreeNodeIds.add(menuState.targetId);
            const descendants = getDescendantIds(menuState.targetId, edges);
            descendants.forEach((id) => subtreeNodeIds.add(id));

            storeApi.getState().pushHistory();

            // Delete all nodes in subtree
            setNodes((prev) => prev.filter((n) => !subtreeNodeIds.has(n.id)));
            // Delete all edges connected to subtree nodes
            setEdges((prev) => prev.filter((e) => !subtreeNodeIds.has(e.source) && !subtreeNodeIds.has(e.target)));
            // Remove deleted nodes from detached set
            const nextDetached = new Set(detachedNodeIdsRef.current);
            subtreeNodeIds.forEach((id) => nextDetached.delete(id));
            detachedNodeIdsRef.current = nextDetached;
          },
        }] : []),
        ...(hasChildren ? [{
          id: 'collapse',
          label: isCollapsed ? 'Expand Subtree' : 'Collapse Subtree',
          icon: isCollapsed ? '▶' : '▼',
          action: () => {
            if (menuState.targetId) {
              toggleNodeCollapse(menuState.targetId);
            }
          },
        }] : []),
        ...(isSubTreeNode ? [{
          id: 'open-subtree',
          label: 'Open Referenced Tree',
          icon: '🌳',
          disabled: !referencedTreeExists,
          action: () => {
            if (referencedTreeId && referencedTreeExists) {
              setActiveTree(referencedTreeId);
            }
          },
        }] : []),
        { id: 'sep-save', label: '', separator: true } as MenuItem,
        {
          id: 'save-template',
          label: 'Save as Template',
          icon: '⭐',
          action: () => {
            if (targetData?.nodeType) {
              const fallbackNodeType = targetData.nodeType;
              const rootId = targetNodeId;
              const descendants = rootId ? getDescendantIds(rootId, edges) : [];
              const subtreeNodeIds = new Set<string>(rootId ? [rootId, ...descendants] : []);

              const subtreeNodes = nodes
                .filter((n) => subtreeNodeIds.has(n.id))
                .map((n) => {
                  const d = n.data as {
                    label?: string;
                    nodeType?: string;
                    category?: string;
                    colors?: { bg: string; border: string; text: string };
                    ports?: Record<string, string>;
                    preconditions?: Record<string, string>;
                    postconditions?: Record<string, string>;
                    childrenCount?: number;
                    description?: string;
                    cdata?: string;
                  };
                  return {
                    id: n.id,
                    position: { x: n.position.x, y: n.position.y },
                    data: {
                      label: d.label,
                      nodeType: d.nodeType ?? fallbackNodeType,
                      category: d.category ?? 'Action',
                      colors: d.colors,
                      ports: d.ports,
                      preconditions: d.preconditions,
                      postconditions: d.postconditions,
                      childrenCount: d.childrenCount,
                      description: d.description,
                      cdata: d.cdata,
                    },
                  };
                });

              const subtreeEdges = edges
                .filter((e) => subtreeNodeIds.has(e.source) && subtreeNodeIds.has(e.target))
                .map((e) => ({
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle ?? null,
                  targetHandle: e.targetHandle ?? null,
                }));

              storeApi.getState().addFavorite({
                name: targetData.label || targetData.nodeType,
                type: targetData.nodeType,
                ports: targetData.ports,
                preconditions: targetData.preconditions,
                postconditions: targetData.postconditions,
                subtree: rootId
                  ? {
                      rootId,
                      nodes: subtreeNodes,
                      edges: subtreeEdges,
                    }
                  : undefined,
                category: targetData.category || 'Action',
              });
            }
          },
        },
        { id: 'sep-cdata', label: '', separator: true } as MenuItem,
        {
          id: 'set-cdata',
          label: 'Set CDATA Block',
          icon: '📦',
          disabled: readonly,
          action: () => {
            if (readonly) return;
            if (menuState.targetId) {
              setEditingCdataNodeId(menuState.targetId);
            }
          },
        },
      ] : [],
      pane: menuState.targetType === 'pane' ? [
        ...(selectedNodeIds.size > 1 ? [{
          id: 'delete-selected',
          label: `Delete Selected (${selectedNodeIds.size})`,
          icon: '🗑️',
          danger: true,
          disabled: readonly,
          action: () => {
            if (readonly) return;
            const idsToDelete = new Set(selectedNodeIds);
            storeApi.getState().pushHistory();
            setNodes((prev) => prev.filter((n) => !idsToDelete.has(n.id)));
            setEdges((prev) => prev.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)));
            const nextDetached = new Set(detachedNodeIdsRef.current);
            idsToDelete.forEach((id) => nextDetached.delete(id));
            detachedNodeIdsRef.current = nextDetached;
            clearSelection();
          },
        }, { id: 'sep-batch', label: '', separator: true } as MenuItem] : []),
        ...(storeApi.getState().clipboard ? [{
          id: 'paste',
          label: 'Paste Node',
          icon: '📋',
          disabled: readonly,
          action: () => {
            if (readonly) return;
            pasteClipboardNode(menuState.position);
          },
        }] : []),
        {
          id: 'add',
          label: 'Add Node',
          icon: '➕',
          disabled: readonly,
          action: () => {
            if (readonly) return;
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
          label: 'Select All',
          icon: '☑️',
          action: () => {
            const allIds = new Set(
              nodes
                .filter((n) => !isSubTreePreviewNode(n))
                .filter((n) => ((n.data as { isRoot?: boolean } | undefined)?.isRoot !== true))
                .map((n) => n.id)
            );
            clearSelection();
            allIds.forEach((id) => storeApi.getState().addToSelection(id));
          },
        },
        {
          id: 'fitview',
          label: 'Fit View',
          icon: '🔍',
          action: () => rfInstanceRef.current?.fitView(),
        },
        {
          id: 'beautify-layout',
          label: 'Beautify Layout',
          icon: '✨',
          disabled: readonly,
          action: () => beautifyLayout(),
        },
      ] : [],
    };
  }, [menuState, nodes, edges, selectedNodeIds, deleteEdge, copyNode, pasteClipboardNode, clearSelection, toggleNodeCollapse, beautifyLayout, project.trees, activeTreeId, setActiveTree, readonly]);

  return (
    <div ref={canvasContainerRef} onMouseMove={handleCanvasMouseMove} onContextMenu={onCanvasContextMenu} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {treeTabsEnabled && <TreeTabs />}
      <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
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
        selectionOnDrag={isBoxSelectionEnabled}
        selectionMode={SelectionMode.Partial}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onMove={onMove}
        onInit={(instance) => {
          rfInstanceRef.current = instance;
          // fitView may adjust zoom after initialization; capture settled value on next frame.
          requestAnimationFrame(() => {
            syncZoomLevel(instance.getZoom());
          });
        }}
        nodeExtent={[[-5000, -5000], [5000, 5000]]}
        fitView
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        connectOnClick={!readonly}
        colorMode={theme}
        style={{
          background: isLightTheme ? '#f7f9fd' : 'var(--bg-primary)',
        }}
        defaultEdgeOptions={{ type: 'btEdge', style: { stroke: '#6888aa', strokeWidth: 2 } }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={isLightTheme ? '#c6d4ea' : '#334'}
          gap={20}
          size={1}
        />
        <Controls
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-secondary)',
            boxShadow: isLightTheme ? '0 2px 10px rgba(44, 73, 118, 0.18)' : 'none',
          }}
        >
          <ControlButton
            onClick={onToggleSidePanels}
            title={toggleSidePanelsLabel}
            aria-label={toggleSidePanelsLabel}
          >
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                display: 'inline-block',
                borderRadius: 2,
                border: `2px solid ${isLightTheme ? '#6d89b7' : '#7f96c0'}`,
                boxSizing: 'border-box',
                background: sidePanelsCollapsed
                  ? (isLightTheme ? 'rgba(74, 128, 208, 0.22)' : 'rgba(127, 150, 192, 0.28)')
                  : 'transparent',
              }}
            />
          </ControlButton>
          <ControlButton
            onClick={beautifyLayout}
            title="Beautify Layout"
            aria-label="Beautify Layout"
          >
            ✨
          </ControlButton>
        </Controls>
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 62,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              boxShadow: isLightTheme ? '0 2px 8px rgba(44, 73, 118, 0.14)' : 'none',
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as { colors?: { bg: string } };
            return d.colors?.bg ?? '#333';
          }}
          style={{
            background: isLightTheme ? '#eef4ff' : '#1a1a2e',
            border: `1px solid ${isLightTheme ? '#c3d1e6' : '#334'}`,
          }}
        />
      </ReactFlow>

      {/* Disconnected nodes warning */}
      {disconnectedNodes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: hasSubTreeLoopWarning ? 52 : 12,
            left: 12,
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
          title={`Disconnected nodes: ${disconnectedNodes.map((n) => (n.data as { label?: string }).label || n.id).join(', ')}`}
        >
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontWeight: 500 }}>One or more nodes are not connected</span>
        </div>
      )}

      {hasSubTreeLoopWarning && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#2a1a12',
            border: '1px solid #c47a46',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            color: '#ffd9c0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            maxWidth: 460,
          }}
          title={SUBTREE_LOOP_WARNING_MESSAGE}
        >
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontWeight: 500 }}>{SUBTREE_LOOP_WARNING_MESSAGE}</span>
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

      {/* CDATA Edit Modal */}
      {editingCdataNodeId && (() => {
        const node = nodes.find((n) => n.id === editingCdataNodeId);
        if (!node) return null;
        const data = node.data as {
          nodeType: string;
          label: string;
          cdata?: string;
        };
        return (
          <CdataEditModal
            nodeId={node.id}
            nodeType={data.nodeType}
            nodeName={data.label !== data.nodeType ? data.label : undefined}
            initialCdata={data.cdata ?? ''}
            onSave={handleCdataSave}
            onClose={() => setEditingCdataNodeId(null)}
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

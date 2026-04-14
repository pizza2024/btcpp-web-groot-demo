import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BTProject, BTNodeDefinition, NodeStatus } from '../types/bt';
import type { Node, Edge } from '@xyflow/react';
import { defaultProject, parseXML, serializeXML } from '../utils/btXml';
import { BUILTIN_NODES } from '../types/bt-constants';

export interface DebugState {
  active: boolean;
  nodeStatuses: Map<string, NodeStatus>; // nodeId -> status
  logText: string;
  playIndex: number;
  entries: Array<{
    timestamp: number;
    nodeUid: number;
    nodeType: string;
    nodeName: string;
    status: NodeStatus;
    treeId: string;
  }>;
}

export interface Groot2State {
  /** Whether we are connected to the Groot2 bridge */
  connected: boolean;
  /** Whether a connection attempt is in progress */
  connecting: boolean;
  /** WebSocket URL of the bridge */
  bridgeUrl: string;
  /** Tree UUID from the BT.CPP runtime */
  treeId: string | null;
  /** Node statuses from the live runtime (uid -> status) */
  liveStatuses: Map<number, NodeStatus>;
  /** Last error message */
  error: string | null;
}

const defaultGroot2: Groot2State = {
  connected: false,
  connecting: false,
  bridgeUrl: 'ws://localhost:8080',
  treeId: null,
  liveStatuses: new Map(),
  error: null,
};

export interface FavoriteTemplate {
  id: string;
  name: string;
  type: string;
  ports?: Record<string, string>;
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  category: string;
  createdAt: number;
}

export interface BTStore {
  project: BTProject;
  activeTreeId: string;
  selectedNodeId: string | null;
  debugState: DebugState;
  groot2State: Groot2State;
  _undoStack: BTProject[];
  _redoStack: BTProject[];
  // Local canvas nodes/edges for lookup before they're saved to project tree
  localNodes: Node[];
  localEdges: Edge[];
  // Collapsed nodes (hidden in canvas)
  collapsedNodeIds: Set<string>;

  // Groot2 real-time debugging
  connectGroot2: (url?: string) => Promise<void>;
  disconnectGroot2: () => void;
  setGroot2LiveStatuses: (statuses: Map<number, NodeStatus>) => void;
  setGroot2Connected: (connected: boolean, treeId?: string | null) => void;
  setGroot2Connecting: (connecting: boolean) => void;
  setGroot2Error: (error: string | null) => void;

  // Project actions
  loadXML: (xml: string) => BTProject | null;
  exportXML: () => string;
  setProject: (p: BTProject) => void;
  setLocalCanvas: (nodes: Node[], edges: Edge[]) => void;

  // Tree actions
  setActiveTree: (id: string) => void;
  addTree: (id: string) => void;
  renameTree: (oldId: string, newId: string) => void;
  deleteTree: (id: string) => void;
  setMainTree: (id: string) => void;

  // Node model actions
  addNodeModel: (def: BTNodeDefinition) => void;
  updateNodeModel: (def: BTNodeDefinition) => void;
  replaceNodeModel: (oldType: string, def: BTNodeDefinition) => void;
  deleteNodeModel: (type: string) => void;

  // Node instance actions
  updateNodePorts: (nodeId: string, ports: Record<string, string>) => void;
  updateNodeName: (nodeId: string, name: string) => void;
  updateNodeConditions: (
    nodeId: string,
    preconditions?: Record<string, string>,
    postconditions?: Record<string, string>
  ) => void;
  updateNodePortRemap: (nodeId: string, portRemap?: Record<string, string>) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  isNodeCollapsed: (nodeId: string) => boolean;

  // Selection
  selectNode: (id: string | null) => void;
  selectedNodeIds: Set<string>;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setSelectedNodes: (ids: Set<string>) => void;
  toggleSelection: (id: string) => void;
  deleteSelectedNodes: (nodes: Node[]) => void;

  // Clipboard (copy/paste)
  clipboard: { node: Node; offsetX: number; offsetY: number } | null;
  copyNode: (node: Node) => void;
  pasteNode: (position?: { x: number; y: number }) => Node | null;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  initTheme: () => void;

  // Undo/Redo actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Debug actions
  loadDebugLog: (text: string) => void;
  debugStep: (direction: 'forward' | 'back') => void;
  debugPlay: () => void;
  debugReset: () => void;

  // Favorites/Templates
  favorites: FavoriteTemplate[];
  addFavorite: (template: Omit<FavoriteTemplate, 'id' | 'createdAt'>) => void;
  removeFavorite: (id: string) => void;
  updateFavorite: (id: string, name: string) => void;
}

const defaultDebug: DebugState = {
  active: false,
  nodeStatuses: new Map(),
  logText: '',
  playIndex: -1,
  entries: [],
};

export const createBTStore = (storageKey = 'bt-tree-editor') => create<BTStore>()(
  persist(
    (set, get) => ({
  project: defaultProject(),
  activeTreeId: 'MainTree',
  selectedNodeId: null,
  debugState: defaultDebug,
  localNodes: [],
  localEdges: [],
  collapsedNodeIds: new Set<string>(),
  // Undo/Redo history
  _undoStack: [] as BTProject[],
  _redoStack: [] as BTProject[],
  // Favorites/Templates
  favorites: [] as FavoriteTemplate[],

  addFavorite(template) {
    const { favorites } = get();
    const newFavorite: FavoriteTemplate = {
      ...template,
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    set({ favorites: [...favorites, newFavorite] });
  },

  removeFavorite(id) {
    const { favorites } = get();
    set({ favorites: favorites.filter((f) => f.id !== id) });
  },

  updateFavorite(id, name) {
    const { favorites } = get();
    set({
      favorites: favorites.map((f) => (f.id === id ? { ...f, name } : f)),
    });
  },

  pushHistory() {
    const { project, _undoStack } = get();
    // Deep clone the project to save as history
    const snapshot = JSON.parse(JSON.stringify(project));
    const newStack = _undoStack.slice(-49); // Keep max 50 items
    set({ _undoStack: [...newStack, snapshot], _redoStack: [] });
  },

  undo() {
    const { _undoStack, project } = get();
    if (_undoStack.length === 0) return;
    const previous = _undoStack[_undoStack.length - 1];
    const newStack = _undoStack.slice(0, -1);
    // Save current to redo stack
    const currentSnapshot = JSON.parse(JSON.stringify(project));
    set({
      project: previous,
      _undoStack: newStack,
      _redoStack: [...get()._redoStack, currentSnapshot],
      selectedNodeId: null,
    });
  },

  redo() {
    const { _redoStack, project } = get();
    if (_redoStack.length === 0) return;
    const next = _redoStack[_redoStack.length - 1];
    const newStack = _redoStack.slice(0, -1);
    // Save current to undo stack
    const currentSnapshot = JSON.parse(JSON.stringify(project));
    set({
      project: next,
      _undoStack: [...get()._undoStack, currentSnapshot],
      _redoStack: newStack,
      selectedNodeId: null,
    });
  },

  canUndo() {
    return get()._undoStack.length > 0;
  },

  canRedo() {
    return get()._redoStack.length > 0;
  },

  setLocalCanvas(nodes, edges) {
    set({ localNodes: nodes, localEdges: edges });
  },

  loadXML(xml) {
    try {
      const project = parseXML(xml);
      set({ project, activeTreeId: project.mainTreeId, selectedNodeId: null, debugState: defaultDebug, localNodes: [], localEdges: [] });
      return project;
    } catch (e) {
      alert('Failed to parse XML:\n' + (e as Error).message);
      return null;
    }
  },

  exportXML() {
    return serializeXML(get().project);
  },

  setProject(p) {
    set({ project: p, localNodes: [], localEdges: [] });
  },

  setActiveTree(id) {
    set({ activeTreeId: id, selectedNodeId: null });
  },

  addTree(id) {
    const { project } = get();
    if (project.trees.find((t) => t.id === id)) {
      alert(`Tree "${id}" already exists`);
      return;
    }
    const newTree = {
      id,
      root: {
        id: `n_${Math.random().toString(36).slice(2, 9)}`,
        type: 'ROOT',
        ports: {},
        children: [],
      },
    };
    set({
      project: { ...project, trees: [...project.trees, newTree] },
      activeTreeId: id,
    });
  },

  renameTree(oldId, newId) {
    const { project } = get();
    if (project.trees.find((t) => t.id === newId)) {
      alert(`Tree "${newId}" already exists`);
      return;
    }
    const trees = project.trees.map((t) => (t.id === oldId ? { ...t, id: newId } : t));
    const mainTreeId = project.mainTreeId === oldId ? newId : project.mainTreeId;
    set({ project: { ...project, trees, mainTreeId }, activeTreeId: newId });
  },

  deleteTree(id) {
    const { project } = get();
    if (project.trees.length <= 1) {
      alert('Cannot delete the only tree');
      return;
    }
    const trees = project.trees.filter((t) => t.id !== id);
    const mainTreeId = project.mainTreeId === id ? trees[0].id : project.mainTreeId;
    set({
      project: { ...project, trees, mainTreeId },
      activeTreeId: mainTreeId,
    });
  },

  setMainTree(id) {
    const { project } = get();
    set({ project: { ...project, mainTreeId: id } });
  },

  addNodeModel(def) {
    const { project } = get();
    const models = [...project.nodeModels.filter((m) => m.type !== def.type), def];
    set({ project: { ...project, nodeModels: models } });
  },

  updateNodeModel(def) {
    const { project } = get();
    const models = project.nodeModels.map((m) => (m.type === def.type ? def : m));
    set({ project: { ...project, nodeModels: models } });
  },

  replaceNodeModel(oldType, def) {
    const { project, localNodes } = get();
    const models = [...project.nodeModels.filter((m) => m.type !== oldType), def];
    const trees = project.trees.map((tree) => ({
      ...tree,
      root: replaceNodeTypeRecursive(tree.root, oldType, def.type),
    }));
    const nextLocalNodes = localNodes.map((node) => {
      const data = node.data as { nodeType?: string; label?: string };
      if (data.nodeType !== oldType) return node;
      return {
        ...node,
        data: {
          ...data,
          nodeType: def.type,
          label: data.label === oldType ? def.type : data.label,
        },
      };
    });

    set({ project: { ...project, nodeModels: models, trees }, localNodes: nextLocalNodes });
  },

  deleteNodeModel(type) {
    const { project } = get();
    if (BUILTIN_NODES.find((n) => n.type === type)) {
      alert('Cannot delete built-in node types');
      return;
    }
    const models = project.nodeModels.filter((m) => m.type !== type);
    set({ project: { ...project, nodeModels: models } });
  },

  selectNode(id) {
    set({ selectedNodeId: id, selectedNodeIds: id ? new Set([id]) : new Set() });
  },

  selectedNodeIds: new Set<string>(),

  addToSelection(id) {
    const { selectedNodeIds } = get();
    const newSet = new Set(selectedNodeIds);
    newSet.add(id);
    set({ selectedNodeIds: newSet, selectedNodeId: id });
  },

  removeFromSelection(id) {
    const { selectedNodeIds } = get();
    const newSet = new Set(selectedNodeIds);
    newSet.delete(id);
    set({ selectedNodeIds: newSet });
  },

  clearSelection() {
    set({ selectedNodeIds: new Set(), selectedNodeId: null });
  },

  setSelectedNodes(ids: Set<string>) {
    set({ selectedNodeIds: ids, selectedNodeId: ids.size === 1 ? Array.from(ids)[0] : null });
  },

  toggleSelection(id) {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.has(id)) {
      get().removeFromSelection(id);
    } else {
      get().addToSelection(id);
    }
  },

  deleteSelectedNodes(_nodes: Node[]) {
    const { selectedNodeIds } = get();
    const idsToDelete = new Set(selectedNodeIds);

    // For now, just clear selection - actual deletion is handled in component
    set({ selectedNodeIds: new Set(), selectedNodeId: null });
    return idsToDelete;
  },

  // Toggle node collapse (hide/show descendants)
  toggleNodeCollapse(nodeId: string) {
    const { collapsedNodeIds } = get();
    const newSet = new Set(collapsedNodeIds);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    set({ collapsedNodeIds: newSet });
  },

  // Check if node is collapsed
  isNodeCollapsed(nodeId: string): boolean {
    return get().collapsedNodeIds.has(nodeId);
  },

  clipboard: null,

  copyNode(node) {
    set({ clipboard: { node, offsetX: 50, offsetY: 50 } });
  },

  pasteNode(position) {
    const { clipboard } = get();
    if (!clipboard) return null;

    const { node } = clipboard;
    const newId = `n_${Math.random().toString(36).slice(2, 9)}`;
    const nextPosition = position ?? {
      x: node.position.x + clipboard.offsetX,
      y: node.position.y + clipboard.offsetY,
    };
    const newNode: Node = {
      ...node,
      id: newId,
      position: nextPosition,
      selected: false,
      data: { ...node.data },
    };

    // Update clipboard offset for next paste
    set({
      clipboard: { ...clipboard, offsetX: clipboard.offsetX + 20, offsetY: clipboard.offsetY + 20 },
    });

    return newNode;
  },

  theme: (localStorage.getItem('bt-theme') as 'dark' | 'light') || 'dark',

  toggleTheme() {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bt-theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
    set({ theme: newTheme });
  },

  initTheme() {
    const saved = localStorage.getItem('bt-theme') as 'dark' | 'light' | null;
    if (saved === 'light') {
      document.documentElement.classList.add('theme-light');
    }
    set({ theme: saved || 'dark' });
  },

  updateNodePorts(nodeId, ports) {
    const { project, activeTreeId } = get();
    const trees = project.trees.map((tree) => {
      if (tree.id !== activeTreeId) return tree;
      return { ...tree, root: updateNodePortsRecursive(tree.root, nodeId, ports) };
    });
    set({ project: { ...project, trees } });
  },

  updateNodeName(nodeId, name) {
    const { project, activeTreeId } = get();
    const trees = project.trees.map((tree) => {
      if (tree.id !== activeTreeId) return tree;
      return { ...tree, root: updateNodeNameRecursive(tree.root, nodeId, name) };
    });
    set({ project: { ...project, trees } });
  },

  updateNodeConditions(nodeId, preconditions, postconditions) {
    const { project, activeTreeId } = get();
    const trees = project.trees.map((tree) => {
      if (tree.id !== activeTreeId) return tree;
      return { ...tree, root: updateNodeConditionsRecursive(tree.root, nodeId, preconditions, postconditions) };
    });
    set({ project: { ...project, trees } });
  },

  updateNodePortRemap(nodeId, portRemap) {
    const { project, activeTreeId } = get();
    const trees = project.trees.map((tree) => {
      if (tree.id !== activeTreeId) return tree;
      return { ...tree, root: updateNodePortRemapRecursive(tree.root, nodeId, portRemap) };
    });
    set({ project: { ...project, trees } });
  },

  loadDebugLog(text) {
    // Support both text format and JSON format
    // Text format (one per line):
    //   timestamp nodeUid nodeType nodeName status [treeId]
    //   e.g.: 100 1 Sequence Root RUNNING MainTree
    // JSON format:
    //   [{ "timestamp": 100, "nodeUid": 1, "nodeType": "Sequence", "nodeName": "Root", "status": "RUNNING", "treeId": "MainTree" }, ...]
    
    let entries: DebugState['entries'] = [];
    const trimmed = text.trim();
    
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      // JSON format
      try {
        const json = JSON.parse(trimmed);
        const arr = Array.isArray(json) ? json : [json];
        entries = arr.map((item: { timestamp?: number; nodeUid?: number; nodeType?: string; nodeName?: string; status?: string; treeId?: string }) => ({
          timestamp: item.timestamp ?? 0,
          nodeUid: item.nodeUid ?? 0,
          nodeType: item.nodeType ?? 'Unknown',
          nodeName: item.nodeName ?? 'Unknown',
          status: (item.status ?? 'IDLE') as NodeStatus,
          treeId: item.treeId ?? get().activeTreeId,
        })).filter((e) => e.nodeType !== '');
      } catch (e) {
        console.error('Failed to parse JSON log:', e);
      }
    } else {
      // Text format
      entries = trimmed.split('\n').map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          timestamp: parseInt(parts[0] ?? '0', 10),
          nodeUid: parseInt(parts[1] ?? '0', 10),
          nodeType: parts[2] ?? 'Unknown',
          nodeName: parts[3] ?? 'Unknown',
          status: (parts[4] ?? 'IDLE') as NodeStatus,
          treeId: parts[5] ?? get().activeTreeId,
        };
      }).filter((e) => e.nodeType !== '');
    }

    set({
      debugState: {
        active: entries.length > 0,
        nodeStatuses: new Map(),
        logText: text,
        playIndex: -1,
        entries,
      },
    });
  },

  debugStep(direction) {
    const { debugState, project } = get();
    if (!debugState.active) return;

    let idx = debugState.playIndex;
    if (direction === 'forward') idx = Math.min(idx + 1, debugState.entries.length - 1);
    else idx = Math.max(idx - 1, -1);

    // Rebuild status map from start up to idx
    const statuses = new Map<string, NodeStatus>();
    for (let i = 0; i <= idx; i++) {
      const entry = debugState.entries[i];
      // Find the matching node by type+name across all trees
      for (const tree of project.trees) {
        const nodeId = findNodeId(tree.root, entry.nodeType, entry.nodeName);
        if (nodeId) {
          statuses.set(nodeId, entry.status);
          break;
        }
      }
    }

    set({ debugState: { ...debugState, nodeStatuses: statuses, playIndex: idx } });
  },

  debugPlay() {
    const stepForward = () => {
      const { debugState } = get();
      if (debugState.playIndex >= debugState.entries.length - 1) return;
      get().debugStep('forward');
      setTimeout(stepForward, 300);
    };
    stepForward();
  },

  debugReset() {
    set({ debugState: defaultDebug });
  },

  // ─── Groot2 real-time debugging ────────────────────────────────────────────

  groot2State: defaultGroot2,

  async connectGroot2(url) {
    // Dynamic import to avoid loading the WebSocket client in SSR or if not needed
    const { getGroot2Client } = await import('../utils/groot2Client');
    const client = getGroot2Client(url);
    const { setGroot2Connecting, setGroot2Connected, setGroot2Error, setGroot2LiveStatuses, groot2State } = get();

    if (groot2State.connected || groot2State.connecting) {
      get().disconnectGroot2();
    }

    setGroot2Connecting(true);
    setGroot2Error(null);

    try {
      await client.connect();
      setGroot2Connected(true);

      // Subscribe to status updates
      client.on((event) => {
        if (event.type === 'status' && event.body) {
          const statuses = new Map<number, NodeStatus>();
          const arr = event.body.node_statuses ?? event.body.statuses ?? [];
          for (const item of arr as Array<{ uid: number; status: NodeStatus }>) {
            if (item.uid !== undefined) {
              statuses.set(item.uid, item.status ?? 'IDLE');
            }
          }
          setGroot2LiveStatuses(statuses);
        }
        if (event.type === 'tree' && event.treeId) {
          setGroot2Connected(true, event.treeId);
        }
        if (event.type === 'disconnected') {
          setGroot2Connected(false);
          setGroot2LiveStatuses(new Map());
        }
        if (event.type === 'error' && event.error) {
          setGroot2Error(event.error);
        }
      });

      // Initial fetch of tree and status
      try {
        const tree = await client.getTree();
        setGroot2Connected(true, tree.treeId);
      } catch { /* tree fetch may fail if runtime not ready */ }

      // Subscribe to live status updates
      await client.subscribe('status');
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Connection failed';
      setGroot2Error(err);
      setGroot2Connecting(false);
      throw e;
    }
  },

  disconnectGroot2() {
    // We can't directly call the client's disconnect from here since it's not in state
    // Use resetGroot2Client instead
    import('../utils/groot2Client').then(({ resetGroot2Client }) => {
      resetGroot2Client();
    });
    set({ groot2State: defaultGroot2 });
  },

  setGroot2LiveStatuses(statuses) {
    const { groot2State } = get();
    set({ groot2State: { ...groot2State, liveStatuses: statuses } });
  },

  setGroot2Connected(connected, treeId = null) {
    const { groot2State } = get();
    set({ groot2State: { ...groot2State, connected, connecting: false, treeId: treeId ?? groot2State.treeId } });
  },

  setGroot2Connecting(connecting) {
    const { groot2State } = get();
    set({ groot2State: { ...groot2State, connecting } });
  },

  setGroot2Error(error) {
    const { groot2State } = get();
    set({ groot2State: { ...groot2State, error } });
  },
}),
    {
      name: storageKey,
      version: 2, // bump when node model schema changes
      partialize: (state) => ({
        project: state.project,
        activeTreeId: state.activeTreeId,
      }),
    }
  )
);

export const defaultBTStore = createBTStore();
export const useBTStore = defaultBTStore;
export type BTStoreApi = ReturnType<typeof createBTStore>;

function findNodeId(node: import('../types/bt').BTTreeNode, type: string, name: string): string | null {
  const nodeName = node.name ?? node.type;
  // Exact match: type and (name or type alias) both match
  const exactMatch = node.type === type && nodeName === name;
  // Leaf node match: log uses Action/Condition as type but our tree stores the ID as node.type
  const isLeafLogType = type === 'Action' || type === 'Condition';
  const leafMatch = isLeafLogType && (node.type === name || nodeName === name);
  // SubTree match: log uses SubTree as type, name is the target tree ID (stored in node.name)
  const subTreeMatch = type === 'SubTree' && node.type === 'SubTree' && nodeName === name;

  if (exactMatch || leafMatch || subTreeMatch) return node.id;
  for (const c of node.children) {
    const found = findNodeId(c, type, name);
    if (found) return found;
  }
  return null;
}

function updateNodePortsRecursive(
  node: import('../types/bt').BTTreeNode,
  nodeId: string,
  ports: Record<string, string>
): import('../types/bt').BTTreeNode {
  if (node.id === nodeId) {
    return { ...node, ports: { ...node.ports, ...ports } };
  }
  if (node.children.length === 0) return node;
  return {
    ...node,
    children: node.children.map((c) => updateNodePortsRecursive(c, nodeId, ports)),
  };
}

function updateNodeNameRecursive(
  node: import('../types/bt').BTTreeNode,
  nodeId: string,
  name: string
): import('../types/bt').BTTreeNode {
  if (node.id === nodeId) {
    return { ...node, name };
  }
  if (node.children.length === 0) return node;
  return {
    ...node,
    children: node.children.map((c) => updateNodeNameRecursive(c, nodeId, name)),
  };
}

function updateNodeConditionsRecursive(
  node: import('../types/bt').BTTreeNode,
  nodeId: string,
  preconditions?: Record<string, string>,
  postconditions?: Record<string, string>
): import('../types/bt').BTTreeNode {
  if (node.id === nodeId) {
    return {
      ...node,
      ...(preconditions !== undefined && { preconditions }),
      ...(postconditions !== undefined && { postconditions }),
    };
  }
  if (node.children.length === 0) return node;
  return {
    ...node,
    children: node.children.map((c) => updateNodeConditionsRecursive(c, nodeId, preconditions, postconditions)),
  };
}

function updateNodePortRemapRecursive(
  node: import('../types/bt').BTTreeNode,
  nodeId: string,
  portRemap?: Record<string, string>
): import('../types/bt').BTTreeNode {
  if (node.id === nodeId) {
    return { ...node, portRemap };
  }
  if (node.children.length === 0) return node;
  return {
    ...node,
    children: node.children.map((c) => updateNodePortRemapRecursive(c, nodeId, portRemap)),
  };
}

function replaceNodeTypeRecursive(
  node: import('../types/bt').BTTreeNode,
  oldType: string,
  newType: string
): import('../types/bt').BTTreeNode {
  const nextNode = node.type === oldType
    ? {
        ...node,
        type: newType,
        ...(node.name === oldType ? { name: newType } : {}),
      }
    : node;

  if (nextNode.children.length === 0) return nextNode;
  return {
    ...nextNode,
    children: nextNode.children.map((child) => replaceNodeTypeRecursive(child, oldType, newType)),
  };
}

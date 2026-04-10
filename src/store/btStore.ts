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

interface BTStore {
  project: BTProject;
  activeTreeId: string;
  selectedNodeId: string | null;
  debugState: DebugState;
  // Local canvas nodes/edges for lookup before they're saved to project tree
  localNodes: Node[];
  localEdges: Edge[];

  // Project actions
  loadXML: (xml: string) => void;
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
  deleteNodeModel: (type: string) => void;

  // Node instance actions
  updateNodePorts: (nodeId: string, ports: Record<string, string>) => void;
  updateNodeName: (nodeId: string, name: string) => void;

  // Selection
  selectNode: (id: string | null) => void;

  // Debug actions
  loadDebugLog: (text: string) => void;
  debugStep: (direction: 'forward' | 'back') => void;
  debugPlay: () => void;
  debugReset: () => void;
}

const defaultDebug: DebugState = {
  active: false,
  nodeStatuses: new Map(),
  logText: '',
  playIndex: -1,
  entries: [],
};

export const useBTStore = create<BTStore>()(
  persist(
    (set, get) => ({
  project: defaultProject(),
  activeTreeId: 'MainTree',
  selectedNodeId: null,
  debugState: defaultDebug,
  localNodes: [],
  localEdges: [],

  setLocalCanvas(nodes, edges) {
    set({ localNodes: nodes, localEdges: edges });
  },

  loadXML(xml) {
    try {
      const project = parseXML(xml);
      set({ project, activeTreeId: project.mainTreeId, selectedNodeId: null, debugState: defaultDebug, localNodes: [], localEdges: [] });
    } catch (e) {
      alert('Failed to parse XML:\n' + (e as Error).message);
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
      root: { id: `n_${Math.random().toString(36).slice(2, 9)}`, type: 'Sequence', ports: {}, children: [] },
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
    set({ selectedNodeId: id });
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

  loadDebugLog(text) {
    // Expected format (one per line):
    // timestamp nodeUid nodeType nodeName status [treeId]
    // e.g.: 100 1 Sequence Root RUNNING MainTree
    const entries = text.trim().split('\n').map((line) => {
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
}),
    {
      name: 'bt-tree-editor', // localStorage key
      version: 2, // bump when node model schema changes
      partialize: (state) => ({
        project: state.project,
        activeTreeId: state.activeTreeId,
      }),
    }
  )
);

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

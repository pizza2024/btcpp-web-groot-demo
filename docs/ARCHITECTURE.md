# Architecture

## 1. Overview

The application is a single-page React app that manages a **Behavior Tree (BT) project** and renders it visually on a **React Flow canvas**.

The core data model (`BTProject`) lives in a **Zustand store**. The canvas view is derived from the tree data via `treeToFlow()` and synced back via `flowToTree()`. XML import/export is handled by `btXml.ts`.

```
User Interaction
      │
      ▼
┌─────────────────────────────────┐
│         btStore (Zustand)       │
│  BTProject { trees, nodeModels,  │
│             mainTreeId }        │
└──────────┬──────────────────────┘
           │ treeToFlow()          │ flowToTree()
           ▼                       ▼
┌─────────────────────────────────┐
│      React Flow (canvas)        │
│  nodes[], edges[], viewState    │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│         btXml.ts                │
│  BT.CPP XML import / export     │
└─────────────────────────────────┘
```

---

## 2. Core Data Model

**`BTProject`** — the root data structure stored in Zustand:

```typescript
interface BTProject {
  trees: BTTree[];           // all behavior trees in the project
  nodeModels: BTNodeDefinition[];  // custom node definitions (palette)
  mainTreeId: string;         // entry-point tree ID
}
```

**`BTTree`** — one behavior tree:

```typescript
interface BTTree {
  id: string;
  root: BTTreeNode;           // ROOT node (always present)
}
```

**`BTTreeNode`** — a single node instance in the tree:

```typescript
interface BTTreeNode {
  id: string;
  type: string;               // e.g. "Sequence", "MoveToGoal"
  name?: string;             // instance alias
  ports: Record<string, string>;          // port name → value / {blackboard_key}
  children: BTTreeNode[];
  // GRoot2 pre/post-conditions
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  // Instance-level description
  description?: string;
  // SubTree port remapping
  portRemap?: Record<string, string>;
}
```

**`BTNodeDefinition`** — a node type template (from palette / `TreeNodesModel`):

```typescript
interface BTNodeDefinition {
  type: string;
  category: 'Control' | 'Decorator' | 'Action' | 'Condition' | 'SubTree';
  ports?: BTPort[];
  description?: string;
  builtin?: boolean;         // built-in nodes not exported to TreeNodesModel
}

interface BTPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  portType?: string;         // int, string, bool, double, NodeStatus, Any
  description?: string;
  defaultValue?: string;
}
```

**`DebugLogEntry`** — one step in a debug replay:

```typescript
interface DebugLogEntry {
  timestamp: number;
  nodeUid: number;
  nodeType: string;
  nodeName: string;
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
  treeId: string;
}
```

---

## 3. Component Architecture

### 3.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│                      Toolbar                              │
├──────────────┬───────────────────────────┬───────────────┤
│              │                           │               │
│  NodePalette │       BTCanvas            │ Properties    │
│  (left)      │       (React Flow)         │ Panel         │
│              │                           │ (right)       │
│  TreeManager │                           │               │
│  (bottom-    │                           │               │
│   left)      │                           │               │
├──────────────┴───────────────────────────┴───────────────┤
│                   DebugPanel (collapsible bottom)          │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Key Components

| Component | Responsibility |
|-----------|---------------|
| `App.tsx` | Root layout; owns the split-panel structure |
| `BTCanvas.tsx` | React Flow canvas; handles drag/drop, connections, viewport |
| `Toolbar.tsx` | Top bar: import/export, undo/redo, theme, help |
| `NodePalette.tsx` | Left sidebar: draggable node type list grouped by category |
| `TreeManager.tsx` | Bottom-left panel: manage multiple BTs, drag tree → SubTree |
| `PropertiesPanel.tsx` | Right sidebar: selected node details + port value editing |
| `DebugPanel.tsx` | Bottom panel: load log, step forward/back through replay |
| `FavoritesPanel.tsx` | Quick-access starred nodes and saved templates |
| `NodeEditModal.tsx` | Double-click node: edit instance name, description, pre/post-conditions |
| `NodeModelModal.tsx` | Palette "+ Add/Edit Model": define custom node types + ports |
| `NodeModal.tsx` | Generic modal for node creation/editing |
| `NodePicker.tsx` | Floating picker that appears when dragging to empty canvas space |
| `ContextMenu.tsx` | Right-click context menu on canvas nodes |
| `KeyboardShortcutsHelp.tsx` | Modal showing all keyboard shortcuts |

### 3.3 Canvas Node Rendering

Each canvas node is rendered by `BTFlowNode.tsx` (a custom React Flow node type).

**Node handle rules** (enforced by connection validation):

| Category | Input Handle | Output Handle | Children |
|----------|-------------|---------------|----------|
| ROOT | ❌ None | ✅ 1 | Exactly 1 |
| Control | ✅ 1 | ✅ 1 | 1..N |
| Decorator | ✅ 1 | ✅ 1 | Exactly 1 |
| Action | ✅ 1 | ❌ None | 0 |
| Condition | ✅ 1 | ❌ None | 0 |
| SubTree | ✅ 1 | ✅ 1 | 0 (references another tree) |

**Multi-handle display**: When a control node has N children, N source handles are rendered side-by-side at the bottom, each connecting to one child's input handle. This prevents edge overlap.

---

## 4. State Management (Zustand)

All BT state lives in `btStore.ts`.

**State shape:**
```typescript
interface BTStore {
  project: BTProject;
  selectedNodeId: string | null;
  selectedTreeId: string;
  // UI state
  isDark: boolean;
  language: 'en' | 'zh';
  // Debug state
  debugLog: DebugLogEntry[];
  debugStep: number;
  // History (undo/redo)
  past: BTProject[];
  future: BTProject[];
  // ...
}
```

**Key actions:**
- `addNode(treeId, parentId, nodeType)` — add a node to a tree
- `deleteNode(treeId, nodeId)` — remove a node and its subtree
- `updateNode(treeId, nodeId, patch)` — update node fields
- `updateNodeConditions(treeId, nodeId, pre?, post?)` — update pre/post-conditions
- `addTree()`, `deleteTree(id)`, `renameTree(id, name)` — tree management
- `importXml(xml)`, `exportXml()` — XML round-trip
- `undo()`, `redo()` — history navigation
- `setDebugLog(log)`, `setDebugStep(step)` — debug replay control

---

## 5. Data Flow

### 5.1 Tree → React Flow (`treeToFlow`)

```typescript
// btFlow.ts
treeToFlow(tree: BTTree): { nodes: Node[], edges: Edge[] }
```

- Recursively traverses `BTTreeNode` hierarchy
- Assigns each node a React Flow `id` (the BT node's `id`)
- Creates a `Node` for every `BTTreeNode`; an `Edge` for every parent→child relationship
- Sets `handle` positions based on node category
- Stores `childrenCount` in node `data` to enable multi-handle rendering

### 5.2 React Flow → Tree (`flowToTree`)

```typescript
// btFlow.ts
flowToTree(treeId: string, nodes: Node[], edges: Edge[]): BTTree
```

- Converts React Flow nodes/edges back to a `BTTree` hierarchy
- Uses an adjacency map built from edges to reconstruct the tree structure
- Handles `SubTree` nodes (which appear as leaves in the parent tree)

### 5.3 Auto-Layout (`btLayout.ts`)

Uses Dagre to compute a top-down DAG layout:

```typescript
layoutTree(tree: BTTree): BTTree
```

Layout is re-run after every structural change to keep the canvas tidy.

---

## 6. XML Import / Export (`btXml.ts`)

### Import (`parseBtXml`)

```
BT.CPP XML v4
    │
    ▼
<TreeNodesModel> → BTNodeDefinition[]  (custom node models)
    │
    ▼
<BehaviorTree ID="…">  →  BTTree.root (recursive BTTreeNode)
```

Handles:
- Built-in node types → correct category mapping
- `<input_port>`, `<output_port>`, `<inout_port>` → `BTPort[]`
- Pre/post-conditions via `ScriptCondition`-style attributes
- SubTree references by ID
- Root always has exactly one child

### Export (`serializeBtXml`)

```
BTProject
    │
    ▼
BTTree[] + BTNodeDefinition[]
    │
    ▼
BT.CPP XML v4  (BTCPP_format="4")
```

Custom node models are serialized to `<TreeNodesModel>`. Built-in nodes are **not** emitted (they are implicit in BT.CPP).

---

## 7. Connection Validation

Connection rules are enforced by `connectionRules.ts`:

```typescript
canConnect(sourceNode, targetNode): { allowed: boolean; reason?: string }
```

Rules checked before a new edge is created:
1. ROOT has no input handle → cannot be a target
2. Leaf nodes (Action, Condition) have no output handle → cannot be a source
3. Decorator nodes must have exactly 1 child
4. ROOT must have exactly 1 child
5. No cycles allowed (DAG validation)
6. Target already has a parent (except Control nodes with `ConnectionPolicy::Many`)

---

## 8. i18n Architecture

Uses `i18next` + `react-i18next`.

- Translation files: `src/i18n/en.ts`, `src/i18n/zh.ts`
- Language switch stored in Zustand (`btStore.isDark`, `btStore.language`)
- Components use `useTranslation()` hook

Currently supported: English (`en`), Chinese (`zh`).

---

## 9. Testing

| Test Type | Framework | Location |
|-----------|-----------|----------|
| Unit tests | Vitest + jsdom | `src/**/*.test.ts` |
| E2E tests | Playwright | `tests/` |

Key test areas:
- `btXml.test.ts` — XML round-trip (import → export → import)
- `btFlow.test.ts` — tree ↔ flow conversion correctness
- `btLayout.test.ts` — Dagre layout produces valid DAG
- `PropertiesPanel.test.ts` — panel renders node info correctly
- `tests/` — E2E: keyboard shortcuts, node picker, import/export flows

---

## 10. Key Files

| File | Purpose |
|------|---------|
| `src/types/bt.ts` | All core TypeScript interfaces |
| `src/store/btStore.ts` | Zustand store — single source of truth |
| `src/utils/btFlow.ts` | Tree ↔ React Flow bidirectional conversion |
| `src/utils/btXml.ts` | BT.CPP XML serialization / parsing |
| `src/utils/btLayout.ts` | Dagre auto-layout |
| `src/components/nodes/BTFlowNode.tsx` | Custom canvas node renderer |
| `src/components/nodes/BTFlowEdge.tsx` | Custom edge renderer |
| `src/components/BTCanvas.tsx` | React Flow canvas + event handling |
| `src/components/NodeEditModal.tsx` | Node instance editor (GRoot2-style) |
| `src/components/NodeModelModal.tsx` | Custom node model editor |

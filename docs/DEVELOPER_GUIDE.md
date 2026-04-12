# Developer Guide

## 1. Setup

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or **npm**

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run all tests
pnpm test
pnpm test:e2e

# Lint
pnpm lint
```

### Environment

- Vite dev server runs on `http://localhost:5173/`
- No backend required — everything runs in the browser
- `localStorage` is used for persisting the BT project between sessions

---

## 2. Code Organization

### Directory Structure

```
src/
├── components/           # React components
│   ├── nodes/           # Custom React Flow node/edge types
│   │   ├── BTFlowNode.tsx
│   │   └── BTFlowEdge.tsx
│   ├── BTCanvas.tsx     # Canvas component
│   ├── Toolbar.tsx      # Top toolbar
│   ├── NodePalette.tsx  # Left palette
│   ├── PropertiesPanel.tsx
│   ├── TreeManager.tsx
│   ├── DebugPanel.tsx
│   ├── FavoritesPanel.tsx
│   ├── NodeEditModal.tsx
│   ├── NodeModelModal.tsx
│   ├── NodeModal.tsx
│   ├── AddNodeModal.tsx
│   ├── NodePicker.tsx
│   ├── ContextMenu.tsx
│   └── KeyboardShortcutsHelp.tsx
├── store/
│   └── btStore.ts       # Zustand store (single source of truth)
├── types/
│   ├── bt.ts            # Core interfaces (BTProject, BTTree, BTTreeNode…)
│   └── bt-constants.ts  # Built-in node registry, connection rules
├── utils/
│   ├── btFlow.ts        # treeToFlow() / flowToTree()
│   ├── btXml.ts         # XML serialization / parsing
│   ├── btLayout.ts      # Dagre auto-layout
│   ├── btPrinter.ts     # (if present) pretty-print tree
│   └── connectionRules.ts
├── i18n/
│   ├── index.ts
│   ├── en.ts
│   └── zh.ts
├── App.tsx
├── App.css
├── index.css
└── main.tsx
tests/                   # Playwright E2E tests
docs/                    # Design docs & user-facing docs
```

---

## 3. Type System

### Core Types (`src/types/bt.ts`)

All types are exported from `bt.ts`. Do not duplicate these definitions elsewhere.

```typescript
// Node category (mutually exclusive with connection constraints)
type BTNodeCategory = 'Control' | 'Decorator' | 'Action' | 'Condition' | 'SubTree';

// Port direction
type PortDirection = 'input' | 'output' | 'inout';

// A port on a node model template
interface BTPort {
  name: string;
  direction: PortDirection;
  portType?: string;    // int | string | bool | double | NodeStatus | Any
  description?: string;
  defaultValue?: string;
}

// A node type definition (from palette / TreeNodesModel)
interface BTNodeDefinition {
  type: string;
  category: BTNodeCategory;
  ports?: BTPort[];
  description?: string;
  builtin?: boolean;
}

// A node instance in a tree
interface BTTreeNode {
  id: string;
  type: string;                  // node type name
  name?: string;                // instance alias
  ports: Record<string, string>; // port name → value / {blackboard_key}
  children: BTTreeNode[];
  // GRoot2 pre/post-conditions
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  description?: string;
  portRemap?: Record<string, string>;
}

// One behavior tree
interface BTTree {
  id: string;
  root: BTTreeNode;   // always present; only one child
}

// The full project
interface BTProject {
  trees: BTTree[];
  nodeModels: BTNodeDefinition[];
  mainTreeId: string;
}
```

### Constants (`src/types/bt-constants.ts`)

- `BUILTIN_NODES: BTNodeDefinition[]` — all built-in BT.CPP nodes
- `EDITOR_ROOT_TYPE: string` — the hardcoded ROOT node type
- `PORT_TYPES: string[]` — allowed port type strings
- `NODE_CATEGORIES: BTNodeCategory[]`

---

## 4. State Management (Zustand)

The Zustand store in `btStore.ts` is the **single source of truth** for all BT data.

### Store Slices

| Slice | Fields |
|-------|--------|
| `project` | `BTProject` — trees, nodeModels, mainTreeId |
| `selectedNodeId` | Currently selected node ID |
| `selectedTreeId` | Currently active tree |
| `isDark` | Dark/light theme |
| `language` | `'en'` \| `'zh'` |
| `debugLog` / `debugStep` | Debug replay state |
| `past` / `future` | Undo/redo history stacks |
| UI flags | `showHelp`, `contextMenu`, etc. |

### State Update Pattern

All mutations go through Zustand actions. **Never** mutate `project` directly — always use the provided actions.

```typescript
// ✅ Correct
btStore.getState().addNode(treeId, parentId, 'Sequence');

// ❌ Wrong
btStore.getState().project.trees[0].root.children.push(newNode);
```

### Undo / Redo

The store maintains `past` and `future` stacks. Every **structural** mutation (add/delete/move node, rename tree, etc.) pushes the previous state onto `past`. Undo pops from `past`, redo pops from `future`.

```typescript
// Undo
const prev = btStore.getState().past.pop();
btStore.setState({ project: prev, future: [...btStore.getState().future, btStore.getState().project] });

// Redo
const next = btStore.getState().future.pop();
btStore.setState({ project: next, past: [...btStore.getState().past, btStore.getState().project] });
```

---

## 5. Adding a New Built-in Node Type

### Step 1: Register in `bt-constants.ts`

```typescript
export const BUILTIN_NODES: BTNodeDefinition[] = [
  // ...existing nodes...
  {
    type: 'MyNewNode',
    category: 'Control',   // or 'Decorator', 'Action', 'Condition'
    description: 'Does something',
    ports: [
      { name: 'param', direction: 'input', portType: 'int', defaultValue: '3' }
    ],
    builtin: true,
  },
];
```

### Step 2: Update Connection Rules (`connectionRules.ts`)

If the new node has special child count requirements, update `getChildConstraint()`:

```typescript
function getChildConstraint(type: string): ChildConstraint {
  if (type === 'MyNewNode') return { min: 2, max: 5 };
  // ...
}
```

### Step 3: Update i18n (`src/i18n/en.ts`, `src/i18n/zh.ts`)

Add translated descriptions if needed.

---

## 6. XML Format Reference

The app targets **BT.CPP XML v4** (`BTCPP_format="4"`).

### Minimal Tree

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence name="Root">
      <Action ID="MoveBase">
        <input_port name="goal">/target</input_port>
      </Action>
    </Sequence>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="MoveBase">
      <input_port name="goal">string</input_port>
    </Action>
  </TreeNodesModel>
</root>
```

### Node Tag Rules

| Node Category | XML Tag | Notes |
|---------------|---------|-------|
| Control | `<TypeName name="…">` | `name` = instance alias |
| Decorator | `<TypeName name="…">` | |
| Action | `<Action ID="TypeName">` | `ID` = type; ports as children |
| Condition | `<Condition ID="TypeName">` | |
| SubTree | `<SubTree ID="OtherTreeID">` | `ID` = target tree |

---

## 7. Canvas Events

### Drag-and-Drop (Palette → Canvas)

```
NodePalette drag start
    ↓
BTCanvas onDragOver (prevent default, set dropEffect)
    ↓
BTCanvas onDrop
    ↓
btStore.addNode(treeId, parentId, nodeType)
    ↓
treeToFlow() + layoutTree()
    ↓
React Flow nodes/edges update
```

### Edge Creation

```
mousedown on source handle
    ↓
React Flow starts connection
    ↓
mouseup on target handle
    ↓
BTCanvas onConnect
    ↓
connectionRules.canConnect() validation
    ↓
If allowed: flowToTree() + btStore update
If denied: show error toast / prevent connection
```

### Node Double-Click (Edit)

```
node double-click
    ↓
BTCanvas onNodeDoubleClick
    ↓
NodeEditModal opens with node data
    ↓
User edits in modal → Apply
    ↓
btStore.updateNode(treeId, nodeId, patch)
    ↓
Canvas re-renders via Zustand subscription
```

---

## 8. Testing

### Unit Tests (Vitest)

```bash
# Run once
pnpm test:run

# Watch mode
pnpm test

# Run specific file
pnpm test -- btXml.test.ts
```

Unit tests live alongside source files:
- `src/utils/btXml.test.ts`
- `src/utils/btFlow.test.ts`
- `src/utils/btLayout.test.ts`
- `src/components/PropertiesPanel.test.tsx`

Key test scenarios:
- XML round-trip: import → export → re-import produces identical trees
- `treeToFlow` / `flowToTree` are inverses
- Layout produces valid DAG (no cycles, all nodes reachable)
- PropertiesPanel renders node info correctly

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e --ui

# Run specific test file
pnpm test:e2e tests/keyboard.spec.ts
```

E2E tests are in `tests/`:
- `keyboard.spec.ts` — keyboard shortcuts (19 tests)
- `nodePicker.spec.ts` — node picker interaction
- `importExport.spec.ts` — XML import/export flows

### Writing Tests

**Vitest (unit):**
```typescript
import { describe, it, expect } from 'vitest';
import { treeToFlow, flowToTree } from '../utils/btFlow';

describe('treeToFlow', () => {
  it('converts a simple tree', () => {
    const tree = { id: 'T1', root: { id: 'n1', type: 'Sequence', ports: {}, children: [] } };
    const { nodes } = treeToFlow(tree);
    expect(nodes).toHaveLength(1);
  });
});
```

**Playwright (E2E):**
```typescript
import { test, expect } from '@playwright/test';

test('import XML button opens file picker', async({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import/i }).click();
  // ...
});
```

---

## 9. Code Style

- **TypeScript strict mode** — no `any`, explicit types everywhere
- **Functional updates** for Zustand state — always create new objects/arrays, never mutate
- **CSS** — plain CSS with class names; no Tailwind; BEM-ish naming in `App.css`
- **Component files** — one component per file; filename matches component name
- **Test files** — `*.test.ts` for utils, `*.test.tsx` for components; co-located with source

---

## 10. Common Tasks

### Adding a New Store Action

1. Define the action in `btStore.ts`
2. If it changes `project`, push previous state onto `past` for undo support
3. Use TypeScript; avoid type assertions

### Adding a New i18n Key

1. Add the key+value to both `en.ts` and `zh.ts`
2. Use `useTranslation()` hook: `const { t } = useTranslation();`
3. Call it as `t('section.key')`

### Adding a New Canvas Node Type

1. `BTFlowNode.tsx` — React Flow renders this for nodes of that type
2. The node's `data.type` field determines which `BTFlowNode` variant renders
3. No new React component needed if the node just displays differently — adjust the existing renderer

### Debugging React Flow Issues

- Use React Flow's built-in devtools (`__flow-devtools`)
- Check `node.data` in the store vs what's actually rendered
- The `BTFlowNode` `id` must match the `BTTreeNode.id`

---

## 11. Useful Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Vitest watch
pnpm test:run     # Vitest single run
pnpm test:e2e     # Playwright E2E
pnpm lint         # ESLint
pnpm preview      # Preview production build locally
```

---

## 12. Architecture Decision Notes

- **Why Zustand?** Lightweight, no boilerplate, works well with React Flow's external state model
- **Why Dagre?** Standard library for DAG layout; produces deterministic top-down layouts
- **Why `localStorage`?** Zero infrastructure; appropriate for a client-only app
- **Why separate `treeToFlow` / `flowToTree`?** Keeps React Flow an implementation detail; the canonical model is always the `BTProject`
- **Why not Redux?** Zustand has less boilerplate and is sufficient for this app's complexity

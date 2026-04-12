# btcpp-web-groot-demo

A **Groot2-like Behavior Tree editor** running entirely in the browser — no backend required.

Built with **Vite + React 19 + TypeScript**, targeting **BehaviorTree.CPP (BT.CPP) XML v4** format.

---

## 🎯 Project Overview

This is a web-based visual editor for Behavior Trees used in robotics and game AI. It allows you to design, edit, and export BT.CPP-compatible XML files directly in the browser, with full support for debugging via log replay.

---

## ✨ Features

### Canvas & Nodes

| Feature | Description |
|---------|-------------|
| **Visual Canvas** | Drag-and-drop nodes using React Flow v12; auto-layout via Dagre; MiniMap; unlimited zoom/pan |
| **Node Palette** | 5 categories: Control, Decorator, Action, Condition, SubTree — with 40+ built-in BT.CPP nodes |
| **Custom Nodes** | Create custom leaf nodes (Action/Condition) with port definitions via the Models Palette |
| **Multi-handle Nodes** | Control nodes (Sequence, Fallback, Parallel…) render one source handle per child to avoid tangled edges |
| **Connection Validation** | Enforces BT.CPP rules: ROOT has no input, leaf nodes have no children, decorators have exactly one child |
| **Node Editing** | Double-click any node to edit its instance name, description, pre/post-conditions; SubTree target tree |
| **Favorites & Templates** | Star frequently used nodes for quick access; save and load node templates (P4-F5) |

### Multiple Behavior Trees

| Feature | Description |
|---------|-------------|
| **Multiple Trees** | Add, rename, delete, and switch between trees in the Tree Manager panel |
| **SubTree References** | `SubTree` nodes reference another tree by ID; supports port remapping |
| **Set Main Tree** | Designate the entry point tree for BT.CPP XML export |

### Import / Export

| Feature | Description |
|---------|-------------|
| **BT.CPP XML Import** | Load any BT.CPP v3/v4 XML file; parses `TreeNodesModel` for custom node definitions |
| **BT.CPP XML Export** | Export the current project as valid `BTCPP_format="4"` XML with full `TreeNodesModel` |
| **PNG Export** | Export the current canvas view as a PNG image |

### Debug / Log Replay

| Feature | Description |
|---------|-------------|
| **Log Replay** | Load a whitespace-delimited log file; step forward/back through node statuses |
| **Status Highlighting** | Color-coded highlights on canvas nodes reflecting their recorded status |
| **Sample Log** | Built-in sample log to demonstrate the replay feature |

### i18n

| Feature | Description |
|---------|-------------|
| **Multi-language UI** | English and Chinese (简体中文) UI via i18next |
| **Switchable** | Toggle language from the toolbar / settings |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected node |
| `Ctrl+D` | Duplicate selected node |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste node |
| `E` | Edit selected node |
| `Space` | Center view |
| `?` | Show keyboard shortcuts help |

---

## 🛠 Tech Stack

- **Vite** — build tool
- **React 19** + **TypeScript** — UI framework
- **@xyflow/react** (React Flow v12) — canvas rendering
- **Zustand** — state management
- **@dagrejs/dagre** — auto-layout algorithm
- **i18next** + **react-i18next** — internationalization
- **Vitest** — unit testing
- **Playwright** — E2E testing
- **html2canvas** — PNG export

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## 📖 Usage

### 1. Add Nodes to Canvas

Drag a node type from the left **Node Palette** (or **Models Palette**) onto the canvas.

### 2. Connect Nodes

Drag from the **bottom handle** (output) of a parent node to the **top handle** (input) of a child node. Connection rules are enforced automatically.

### 3. Edit Node Properties

- **Double-click** a node → `NodeEditModal`: edit instance name, description, pre/post-conditions, SubTree target
- **Right-click** a node → context menu: Add Child, Edit, Delete, Duplicate, Copy, Paste, Convert to Subtree
- **Properties Panel** (right sidebar): view/edit port values for selected node

### 4. Multiple Behavior Trees

Use the **Tree Manager** panel (bottom-left) to:
- Add / rename / delete trees
- Switch between trees
- Set the **main tree** (entry point)
- Drag a tree into the canvas to create a `SubTree` reference

### 5. Import / Export XML

- **⬆ Import XML**: Click the import button in the toolbar to load any BT.CPP v3/v4 XML file
- **⬇ Export XML**: Click the export button to download the current project as BT.CPP XML

### 6. Debug Replay

1. Click **Sample Log** in the Debug panel (or load your own `.log` file)
2. Use **◀ / ▶** buttons to step through execution
3. Node statuses are color-highlighted on the canvas:
   - 🟢 `SUCCESS` — green
   - 🔴 `FAILURE` — red
   - 🟡 `RUNNING` — yellow
   - ⬜ `IDLE` — gray

### Log Format

One entry per line:

```
<timestamp_ms> <nodeUid> <nodeType> <nodeName> <STATUS> [treeId]
```

Example:
```
0   1  Sequence  Root         RUNNING  MainTree
10  2  Condition CheckBattery SUCCESS  MainTree
20  3  Action    MoveToGoal   RUNNING  MainTree
```

Statuses: `IDLE` | `RUNNING` | `SUCCESS` | `FAILURE`

---

## 📁 Project Structure

```
btcpp-web-groot-demo/
├── docs/                    # Design & developer documentation
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── nodes/           # Custom React Flow node types
│   │   │   ├── BTFlowNode.tsx
│   │   │   └── BTFlowEdge.tsx
│   │   ├── BTCanvas.tsx     # Main canvas component
│   │   ├── Toolbar.tsx      # Top toolbar
│   │   ├── NodePalette.tsx  # Node type palette
│   │   ├── NodePicker.tsx   # Floating node picker on drop
│   │   ├── PropertiesPanel.tsx
│   │   ├── TreeManager.tsx
│   │   ├── DebugPanel.tsx
│   │   ├── FavoritesPanel.tsx
│   │   ├── NodeEditModal.tsx
│   │   ├── NodeModelModal.tsx
│   │   ├── NodeModal.tsx
│   │   ├── ContextMenu.tsx
│   │   └── KeyboardShortcutsHelp.tsx
│   ├── store/
│   │   └── btStore.ts       # Zustand store (all BT state)
│   ├── types/
│   │   └── bt.ts            # Core TypeScript interfaces
│   ├── utils/
│   │   ├── btFlow.ts        # Tree ↔ React Flow conversion
│   │   ├── btXml.ts         # XML parse/serialize
│   │   └── btLayout.ts      # Dagre auto-layout
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── en.ts
│   │   └── zh.ts
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── tests/                   # Playwright E2E tests
├── package.json
├── vite.config.ts
├── tsconfig.json
└── playwright.config.ts
```

---

## 📄 License

Private / MIT-style (refer to project maintainer)

# btcpp-web-groot-demo

A **Groot2-like Behavior Tree editor** running entirely in the browser — no backend required.

Built with **Vite + React + TypeScript**, targeting **BehaviorTree.CPP (BT.CPP) XML v4** format.

![BT Editor screenshot](https://github.com/user-attachments/assets/04b0ed13-ed28-4e66-acc2-90e21d4d769f)

## Features

| Feature | Details |
|---|---|
| **Node Palette** | Built-in Control (Sequence, Fallback, Parallel, …), Decorator (Inverter, Retry, Repeat, …), SubTree, and custom leaf nodes |
| **Visual Canvas** | Drag-and-drop nodes from palette; connect parent→child via handles; auto-layout via Dagre; MiniMap |
| **Multiple BehaviorTrees** | Add, rename, delete, and switch between trees; set the main tree |
| **Properties Panel** | Shows selected node details; edit port definitions for custom nodes |
| **BT.CPP XML Import/Export** | Parses and emits valid `BTCPP_format="4"` XML with `<TreeNodesModel>` |
| **Debug / Log Replay** | Load a whitespace-delimited log file; step forward/back through node statuses; color-coded highlights on canvas |

## Quick Start

```bash
npm install
npm run dev
```

Then open <http://localhost:5174/>.

## Build Modes

This project now supports both deployment modes:

1. **Standalone web editor** (current behavior)
2. **Embeddable React component** (`BTEditor`) for other projects

### Standalone build

```bash
pnpm run build:web
```

### Component library build

```bash
pnpm run build:lib
```

### Build both

```bash
pnpm run build
```

## Embed In Another React App

```tsx
import { BTEditor } from 'btcpp-web-groot-demo';

export function Example() {
	return (
		<div style={{ width: 500, height: 500 }}>
			<BTEditor storageKey="bt-editor-a" />
		</div>
	);
}
```

Notes:

1. `BTEditor` fills its parent container (`width: 100%`, `height: 100%`).
2. Use a unique `storageKey` per editor instance to isolate persisted state.
3. The standalone page remains available and unchanged for independent deployment.

## Usage

1. **Palette → Canvas**: Drag a node type from the left palette onto the canvas.
2. **Connect nodes**: Drag from the bottom handle of a parent to the top handle of a child.
3. **Properties**: Click a node to see its definition and port values.
4. **Multiple trees**: Use the *Behavior Trees* panel (bottom-left) to add/switch/rename trees. `SubTree` nodes reference another tree by name.
5. **Import XML**: Click **⬆ Import XML** to load any BT.CPP v3/v4 XML file.
6. **Export XML**: Click **⬇ Export XML** to download the current project as BT.CPP XML.
7. **Debug replay**: Click **Sample Log** (or load your own `.log` file) in the *Debug* panel, then use ◀ / ▶ to step through execution and see node statuses highlighted on the canvas.

## Log Format

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

## Tech Stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript
- [@xyflow/react](https://reactflow.dev/) (React Flow v12) — canvas
- [Zustand](https://zustand-demo.pmnd.rs/) — state management
- [@dagrejs/dagre](https://github.com/dagrejs/dagre) — auto-layout

# bt-editor

A browser-based Behavior Tree editor inspired by Groot2, built with Vite, React, and TypeScript.

The project supports two delivery modes:

- Standalone web editor for direct browser use
- Embeddable `BTEditor` React component for integration into other applications

It targets BehaviorTree.CPP XML v4 workflows and runs fully on the client side.

![BT Editor screenshot](https://github.com/user-attachments/assets/04b0ed13-ed28-4e66-acc2-90e21d4d769f)

## What Changed Recently

The latest commits after `v0.1.0` mainly focused on editor usability and package readiness:

- Renamed the published package to `bt-editor`
- Kept the standalone app and reusable component library as dual entry modes
- Improved auto-layout with better sibling ordering and subtree compaction
- Added beautify layout support for cleaner tree arrangement
- Enhanced subtree dragging support with modifier-key interactions
- Upgraded the XML preview panel with formatting and inline editing capabilities
- Added readonly/view mode support for node model inspection

## Feature Highlights

- GRoot2-style canvas editing with drag-and-drop node placement
- Built-in BT.CPP node categories plus custom node model support
- Multi-tree project management with `SubTree` references
- Auto-layout and beautify layout for faster tree cleanup
- Properties panel for node instance editing
- XML import/export compatible with `BTCPP_format="4"`
- XML preview panel with formatting and editing support
- Debug/log replay panel with timeline stepping and status highlighting
- Favorites panel and reusable templates for faster node creation
- English and Chinese UI support
- Standalone app mode and embeddable React component mode

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Install

```bash
pnpm install
```

### Start the standalone editor

```bash
pnpm dev
```

Then open the local URL printed by Vite, typically `http://localhost:5173`.

## Build

### Build the standalone web app

```bash
pnpm build:web
```

### Build the embeddable library

```bash
pnpm build:lib
```

### Build both outputs

```bash
pnpm build
```

## Use as a React Component

Install the package in your host application and render `BTEditor` inside a container with an explicit size.

```tsx
import { BTEditor } from 'bt-editor';

export function Example() {
	return (
		<div style={{ width: 960, height: 640 }}>
			<BTEditor storageKey="bt-editor-demo" />
		</div>
	);
}
```

Notes:

- `BTEditor` fills the parent container, so the parent must define width and height
- `storageKey` isolates persisted editor state between instances
- The library build externalizes `react`, `react-dom`, and `react/jsx-runtime`

## Core Workflows

### Editing trees

- Drag nodes from the palette onto the canvas
- Connect parent and child nodes through handles
- Use the tree manager to create, rename, switch, and delete Behavior Trees
- Reference another tree through `SubTree` nodes

### Layout

- Use auto-layout to normalize structure after edits
- Use beautify layout to compact sibling subtrees and improve readability
- Sibling ordering is preserved more reliably during layout recalculation

### Import and export

- Import BehaviorTree.CPP XML files into the editor
- Export the current project back to BT.CPP XML
- Review and edit generated XML in the XML preview panel
- Format XML directly in the preview panel before export

### Debug replay

- Load a log file and step through execution state changes
- Inspect node statuses directly on the canvas
- Use the panel to replay execution flow without a backend service

## Log Format

One entry per line:

```text
<timestamp_ms> <nodeUid> <nodeType> <nodeName> <STATUS> [treeId]
```

Example:

```text
0   1  Sequence  Root         RUNNING  MainTree
10  2  Condition CheckBattery SUCCESS  MainTree
20  3  Action    MoveToGoal   RUNNING  MainTree
```

Supported statuses: `IDLE`, `RUNNING`, `SUCCESS`, `FAILURE`

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the Vite development server |
| `pnpm build:web` | Build the standalone web app |
| `pnpm build:lib` | Build the component library |
| `pnpm build` | Build both outputs |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Start Vitest in watch mode |
| `pnpm test:run` | Run Vitest once |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm preview` | Preview the production web build |

## Tech Stack

- React 19
- TypeScript
- Vite
- `@xyflow/react` for graph rendering
- Zustand for state management
- `@dagrejs/dagre` for layout calculation
- i18next for localization
- Vitest and Playwright for test coverage

## Documentation

Additional design and development notes are available under `docs/`, including:

- `docs/ARCHITECTURE.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/CHANGELOG.md`
- `docs/NODE_EDITING.md`
- `docs/GRoot2_NODE_EDITING.md`

## Status

Current package version: `0.1.0`

Recent development has already moved beyond the original `v0.1.0` release tag, so this README reflects the current `main` branch rather than only the last published release.

# bt-editor

A browser-based Behavior Tree editor inspired by Groot2, built with Vite, React, and TypeScript.

The project provides two delivery modes:

- Standalone web editor for direct browser use
- Embeddable `BTEditor` React component for integration into other applications

It targets BehaviorTree.CPP XML workflows (`BTCPP_format="3"` and `BTCPP_format="4"`) and runs fully on the client side.

![BT Editor latest screenshot](https://github.com/user-attachments/assets/04b0ed13-ed28-4e66-acc2-90e21d4d769f)

## What's New (Current Main)

Recent updates focused on practical editing speed, XML workflow improvements, and integration readiness:

- Dual delivery mode maintained and published as `bt-editor`
- XML format switch (`v3` / `v4`) in toolbar, with safety lock once tree content exists
- Live XML panel upgraded with:
  - Per-tab preview mode and full-project main-tree mode
  - Copy, inline edit, XML validation, and save-back workflow
  - Resizable + collapsible panel behavior
- Improved subtree workflow:
  - Better subtree drag/move interactions (Ctrl/Alt drag)
  - SubTree references generated from project trees in palette
  - SubTree target editing and auto-remap support
- Better layout readability with auto-layout and beautify-style compaction
- Favorites panel for reusable node templates and quick drag-back to canvas
- Readonly/view mode for model inspection from node palette
- PNG export from toolbar for quick sharing/review
- Live debug connection (Groot2 bridge) + log replay tooling in one panel
- Missing node model importer flow after XML import

## Feature Overview

### Canvas and Editing

- GRoot2-style drag-and-drop node editing
- Connect nodes through typed handles with rule validation
- Double-click node editing (instance-level fields, ports, conditions)
- Node picker and node search for quick insertion at cursor/drop position

### Multi-Tree Management

- Create, rename, switch, and delete trees
- Main-tree designation and tree tabs for parallel editing
- SubTree reference workflow across trees

### XML Workflow

- Import BehaviorTree.CPP XML projects
- Export XML from the current project
- Toggle XML target format (`v3` or `v4`)
- Live XML preview with local/main mode switch
- Edit XML in place with parse validation before apply

### Debug and Replay

- Replay text/JSON logs to visualize node status transitions
- Step/play through timeline and inspect current entry details
- Connect to runtime through Groot2 bridge (`ws://`) for live status updates

### UX and Productivity

- Light/dark theme toggle
- English/Chinese language toggle
- Keyboard shortcuts help panel
- Favorites, model search/filter, and import-assist dialogs

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Install

```bash
pnpm install
```

### Run standalone editor

```bash
pnpm dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Build

### Build standalone web app

```bash
pnpm build:web
```

### Build embeddable library

```bash
pnpm build:lib
```

### Build both

```bash
pnpm build
```

## Use as a React Component

Install the package in your host app and render `BTEditor` inside a sized container.

```tsx
import { BTEditor } from "bt-editor";

export function Example() {
  return (
    <div style={{ width: 960, height: 640 }}>
      <BTEditor storageKey="bt-editor-demo" />
    </div>
  );
}
```

Notes:

- `BTEditor` fills the parent container, so parent width/height are required
- `storageKey` isolates persisted editor state between instances
- Library output externalizes `react`, `react-dom`, and `react/jsx-runtime`

## Debug Log Format

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

| Script           | Description                       |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Start the Vite development server |
| `pnpm build:web` | Build the standalone web app      |
| `pnpm build:lib` | Build the component library       |
| `pnpm build`     | Build both outputs                |
| `pnpm lint`      | Run ESLint                        |
| `pnpm test`      | Start Vitest                      |
| `pnpm test:run`  | Run Vitest once                   |
| `pnpm test:e2e`  | Run Playwright end-to-end tests   |
| `pnpm preview`   | Preview production web build      |

## Tech Stack

- React 19
- TypeScript
- Vite
- `@xyflow/react` for graph rendering
- Zustand for state management
- `@dagrejs/dagre` for layout
- i18next for localization
- Vitest + Playwright for tests

## Documentation

See the `docs/` folder for architecture and implementation details:

- `docs/ARCHITECTURE.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/CHANGELOG.md`
- `docs/NODE_EDITING.md`
- `docs/GRoot2_NODE_EDITING.md`

## Status

Current package version: `0.1.2`

This README describes the current `main` branch behavior.

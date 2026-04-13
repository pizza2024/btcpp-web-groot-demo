# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

No unreleased changes at this time — `main` is the stable branch.

---

## [0.0.0] — Initial releases

> The following entries cover the full development history from the first commit through P4 completion.

### Added

- **P4-F5: Node Favorites & Templates** (`d710790`)
  - Star frequently used nodes for quick access
  - Save and load node templates
  - Favorites persist across sessions

- **i18n: PropertiesPanel, NodePalette, NodePicker, TreeManager** (`bc8ae97`)
  - Full internationalization coverage across all major panels
  - UI labels and messages now support en/zh

- **P4-F4: Multi-language Support** (`a176933`)
  - English and Chinese UI via i18next
  - Language toggle accessible from toolbar/settings

- **P4: Canvas Zoom Enhancement** (`eb927df`)
  - Improved zoom behavior and limits
  - Better viewport controls

- **P4: Ctrl+Drag Subtree Movement** (`4fd0fa4`, closes #4)
  - Hold Ctrl while dragging to move entire subtrees
  - Better visual feedback during subtree drag

- **P2+P3 Feature Bundle** (`b972466`)
  - Full GRoot2-style node editing (double-click → modal)
  - Instance name editing for Control/Decorator nodes
  - Editable Description field on node instances
  - Pre/post-conditions editor (4-block form: Instance, Port, Pre-conditions, Post-conditions)
  - SubTree target tree selection via dropdown
  - Auto-remap ports by name for SubTree nodes
  - Port definition editing in NodeModelModal (portType, direction, default value)
  - 5-category Node Palette: Control, Decorator, Action, Condition, SubTree
  - 40+ built-in BT.CPP nodes registered
  - Search filter in Models Palette
  - Port values display on canvas nodes (grouped IN/OUT)
  - PropertiesPanel Apply button updates canvas nodes in real-time
  - Warning displayed for unconnected nodes on canvas
  - PropertiesPanel port Apply fix + modal button styling improvements
  - Show ports from node definition even when port value is not set
  - Refactor: NodeEditModal (instance editing) separated from NodeModelModal (model editing)
  - Double-click on port to edit parent node
  - Improved port display styling on nodes
  - Node handles shown based on connection rules
  - Node connection validation rules (enforces BT.CPP topology constraints)
  - Uniform rectangular style for all node types
  - Node Picker appears at exact mouse release position; stays within viewport bounds
  - Draggable tree items in TreeManager → create SubTree references by dragging into canvas
  - Drag from handle to empty space → shows Node Picker for quick node creation

- **Add Custom Node Modal** (`908670d`, `51b85c9`, `a04a926`)
  - Create custom Action/Condition nodes with port definitions
  - Port direction (input/output/inout), port type (int, string, bool, etc.), default value
  - Custom nodes appear in palette and are exported to `TreeNodesModel`

- **Node Double-Click Edit** (`e6806f5`, `93b19ac`, `440e6f1`)
  - Double-click canvas node opens NodeEditModal
  - Edit instance name, description, ports, pre/post-conditions
  - GRoot2-style ROOT entry node

- **Double-Click Node Opens Edit Modal** (`e6806f5`)
  - Double-clicking a node on canvas opens an edit modal for that node instance

- **GRoot2 Node Editing** (`b7fbc65`, `0671378`)
  - Full GRoot2-style node editing architecture documented
  - Separate NodeEditModal (instance) and NodeModelModal (model) components

- **Convert Add Custom Node Form to Modal Dialog** (`51b85c9`)
  - Improved UX: modal instead of inline form

- **Update to 5-Category Node Palette (Action/Condition Split)** (`a04a926`)
  - Separate Action and Condition categories in palette
  - Better organization for leaf nodes

- **Node Picker** (`5e3bcdd`, `305330c`)
  - Floating picker appears when dragging a connection to empty canvas space
  - Select node type to create without returning to palette
  - E2E tests for node picker functionality

- **Persist Version for localStorage Cache Clear** (`36ecd55`)
  - Added version field to localStorage to force cache clear on breaking changes

- **Missing Loop Nodes** (`b55e2ed`)
  - Added `LoopBool`, `LoopDouble`, `LoopString` built-in nodes

- **Unify Node Modals** (`c5321a5`)
  - Consolidated node editing into single NodeModal component

- **Auto-Discover Custom Nodes from Imported XML** (`d8ed7f3`)
  - When importing BT.CPP XML, automatically creates node model entries for custom Action/Condition nodes found in `TreeNodesModel`

- **Reset localNodes/localEdges on Load** (`832f70d`)
  - Clear React Flow state when loading a new project

- **Improved PropertiesPanel Save** (`e4779c3`)
  - Better merge strategy for port values when saving

### Fixed

- **P3 Node Model Validation** (`0800bbc`, closes #3)
  - Validation for custom node model definitions
  - Prevents creating invalid node models

- **vitest.config.ts with jsdom Environment** (`e069414`)
  - Excludes Playwright specs from Vitest runs

- **Apply Button Updates Canvas Nodes in Real-Time** (`4a5150f`)
  - Changes in PropertiesPanel now immediately reflect on canvas

- **Show Warning for Unconnected Nodes** (`39ca1cb`)
  - Warning displayed when nodes are missing required connections

- **PropertiesPanel Port Apply Not Working** (`a3be39f`)
  - Port value changes now correctly saved

- **Search Filter in Models Palette** (`6e07b14`)
  - Filter works correctly across all categories

- **Show Ports from Node Definition Even When Not Set** (`81bfcab`)
  - Ports from node definition always displayed, even without a value

- **Node Picker Closes Immediately After Opening** (`8dfdef3`)
  - Node picker now stays open until user selects a node

- **Node Picker Not Showing on Empty Space Drop** (`1e57eae`, `2b94eb7`)
  - Node picker now correctly appears when dragging to empty canvas area

- **Node Picker Position Stays Within Viewport Bounds** (`8043ea4`)
  - Node picker never renders outside visible area

- **Node Picker Using Wrong Node Type** (`7ef4572`)
  - Fixed `btFlow` type instead of `btNode`

- **Uniform Rectangular Style for All Node Types** (`a405bfb`)
  - Consistent visual style regardless of node category

- **Node Picker Trigger and Single Handle Per Node** (`acb6e48`)
  - Fixed trigger behavior for node picker

- **Description Field Persists When Reopening Edit Modal** (`66ae08b`)
  - Description now correctly restored

- **ModelName Field Disabled** (`da01250`)
  - ModelName field shows nodeType but is not editable

- **NodeEditModal NodeType/ModelName Display** (`85b0884`)
  - NodeType shows category; ModelName shows nodeType

- **Sort NodePalette Items Alphabetically** (`da5ea60`, `4bb72fe`)
  - Both categories and items within categories sorted

- **Initialize with Empty ROOT** (`9e7ec02`)
  - App starts with an empty ROOT node (no default Sequence child)

- **PropertiesPanel Crash on ROOT Node** (`a5df16d`)
  - Clicking ROOT node no longer crashes PropertiesPanel

- **NodePicker Position at Mouse Release** (`c8dbd29`)
  - Picker appears at exact cursor position on release

- **Reset localNodes/localEdges on New Project Load** (`832f70d`)
  - Prevents stale canvas state when switching projects

- **PropertiesPanel Save Merge** (`e4779c3`)
  - Fresh `btNode.ports` used for merge on save

- **Auto-Discover Custom Nodes on Import** (`d8ed7f3`)
  - Correctly finds and registers custom nodes from XML

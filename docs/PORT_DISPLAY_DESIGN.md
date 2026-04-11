# Port Display & Editing Design

## Current State

### Modals
1. **NodeEditModal** (double-click on canvas node)
   - Currently HAS port value editing
   - Should: REMOVE port editing, just show instance info

2. **NodeModelModal** (palette "+ Add Model" or "Edit Model")
   - Already HAS port definition editing
   - OK to KEEP as-is

### Canvas Nodes
- Currently shows ports in "IN" and "OUT" groups
- Does NOT properly handle "inout" direction ports

## Requirements

### 1. NodeEditModal - NO Port Editing
When double-clicking a node on canvas:
- Show node type, instance name, description
- Show pre/post-conditions
- NO port value editing (that's for ModelModal)

### 2. NodeModelModal - Port Definition Editing (KEEP)
When creating/editing a model from palette:
- Can add/remove ports
- Can edit port name, direction (input/output/inout), type, default value

### 3. Canvas Node Port Display
Show ports grouped by direction:
- **IN** (input ports) - ports that provide data TO this node
- **OUT** (output ports) - ports that produce data FROM this node
- **IN/OUT** (inout ports) - bidirectional ports

Port values (the actual blackboard keys or literal values) should be displayed but NOT editable on the canvas.

## Implementation Plan

### Step 1: Remove Port Editing from NodeEditModal
- Remove `portValues` state and related UI
- Remove `handlePortChange` function
- Remove port value display section
- Keep only: instance name, description, pre/post-conditions

### Step 2: Update Canvas Node Port Display
- Group ports by direction:
  - `direction === 'input'` → "IN" group
  - `direction === 'output'` → "OUT" group
  - `direction === 'inout'` → "IN/OUT" group
- For ports with no explicit direction, check if name suggests direction (e.g., starts with "in"/"out")
- Display port value (read-only) for each port

### Step 3: Update NodeModelModal (if needed)
- Ensure "inout" direction is in the dropdown
- Already working correctly

## Port Direction Logic

```typescript
function getPortGroup(port: BTPort, portValue: string): 'IN' | 'OUT' | 'IN/OUT' {
  if (port.direction === 'input') return 'IN';
  if (port.direction === 'output') return 'OUT';
  if (port.direction === 'inout') return 'IN/OUT';
  
  // Fallback: check name patterns
  if (port.name.startsWith('in') || port.name.startsWith('input')) return 'IN';
  if (port.name.startsWith('out') || port.name.startsWith('output')) return 'OUT';
  
  return 'IN'; // default to input
}
```

## File Changes

1. `src/components/NodeEditModal.tsx` - Remove port editing code
2. `src/components/nodes/BTFlowNode.tsx` - Update port grouping display
3. `src/types/bt-constants.ts` - Verify port directions are defined

## Verification
- Double-click node → modal has NO port editing
- Palette model edit → modal HAS port editing
- Canvas nodes show ports with correct IN/OUT/IN/OUT grouping

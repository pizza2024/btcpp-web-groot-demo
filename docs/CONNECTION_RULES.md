# Behavior Tree Node Connection Rules

This document describes the rules for connecting nodes in a Behavior Tree editor, based on Groot2 and BehaviorTree.CPP.

## Node Categories & Port Structure

| Category | Input Ports | Output Ports | Children | Notes |
|----------|-------------|--------------|----------|-------|
| **ROOT** | 0 | 1 | Exactly 1 | Entry point of tree |
| **Action** | 1 | 0 | 0 | Terminal leaf node |
| **Condition** | 1 | 0 | 0 | Terminal leaf node |
| **Control** | 1 | 1 | 0..N (min 1) | Sequence, Fallback, Parallel, etc. |
| **Decorator** | 1 | 1 | Exactly 1 | Inverter, ForceSuccess, Retry, etc. |
| **SubTree** | 1 | 1 | 0 | Reference to another tree |

## Connection Rules (from Groot2)

### Rule 1: Port Compatibility
- **Source (output)** can connect to **Target (input)**
- A node's output can connect to multiple targets (many connections)
- A node's input typically accepts only one connection (except special cases)

### Rule 2: Root Node
- Root has **NO input port** and **1 output port**
- Root can only have **ONE child** (ConnectionPolicy::One)
- Root output can only connect to one child node

### Rule 3: Leaf Nodes (Action, Condition)
- Leaf nodes have **1 input port** and **NO output ports**
- Cannot have any children
- Once connected to parent, cannot accept any outgoing connections

### Rule 4: Control Nodes (Sequence, Fallback, Parallel, etc.)
- Control nodes have **1 input port** and **1 output port**
- Can have **MULTIPLE children** (ConnectionPolicy::Many)
- Children connect to parent's output

### Rule 5: Decorator Nodes
- Decorator nodes have **1 input port** and **1 output port**
- Must have **exactly 1 child** (ConnectionPolicy::One)
- Decorator modifies the behavior of its single child

### Rule 6: SubTree Nodes
- SubTree nodes have **1 input port** and **1 output port**
- Can have **MULTIPLE children** internally, but from outside looks like a leaf
- NO children visible in parent tree (references another tree)

## Control Node Child Count Requirements

| Node Type | Min Children | Max Children | Notes |
|-----------|--------------|--------------|-------|
| Sequence | 1 | Unlimited | |
| Fallback | 1 | Unlimited | |
| SequenceWithMemory | 1 | Unlimited | |
| Parallel | 1 | Unlimited | |
| ParallelAll | 1 | Unlimited | |
| ReactiveSequence | 1 | Unlimited | |
| ReactiveFallback | 1 | Unlimited | |
| IfThenElse | 2 | 3 | condition, then, [else] |
| WhileDoElse | 2 | 3 | condition, do, [else] |
| TryCatch | 2 | Unlimited | last child is catch |
| Switch2 | 2 | 3 | cases + default |
| Switch3 | 3 | 4 | cases + default |
| SwitchN... | N | N+1 | cases + default |

## Decorator Child Count Requirements

| Node Type | Min Children | Max Children | Notes |
|-----------|--------------|--------------|-------|
| Inverter | 1 | 1 | |
| ForceSuccess | 1 | 1 | |
| ForceFailure | 1 | 1 | |
| RetryUntilSuccessful | 1 | 1 | |
| KeepRunningUntilFailure | 1 | 1 | |
| Repeat | 1 | 1 | |
| RaceLoading | 1 | 1 | |

## Visual Representation in UI

### Handle Positions
- **Input handle**: Top center of node (for non-Root nodes)
- **Output handle**: Bottom center of node (for non-leaf nodes)

### Handle Styling by Connection Policy
- **One (single child)**: Single circular handle
- **Many (multiple children)**: Single circular handle (multiple edges from one handle)

## Implementation Checklist

### Phase 1: Basic Connection Rules
- [x] ROOT: No input handle, 1 output handle, max 1 connection
- [x] Action/Condition: 1 input handle, no output handle
- [x] Control: 1 input handle, 1 output handle, unlimited children
- [x] Decorator: 1 input handle, 1 output handle, max 1 child
- [x] SubTree: 1 input handle, 1 output handle, unlimited children

### Phase 2: Validation
- [ ] Prevent invalid connections (e.g., leaf to leaf)
- [ ] Show error when connection would violate rules
- [ ] Visual feedback for allowed/disallowed connections

### Phase 3: Advanced Rules
- [ ] Control node min child count validation
- [ ] Special node child count requirements (IfThenElse, Switch, etc.)

## References
- Groot2 source: `/tmp/Groot/bt_editor/models/BehaviorTreeNodeModel.cpp`
- nodeeditor: `/tmp/nodeeditor/src/NodeConnectionInteraction.cpp`
- BehaviorTree.CPP docs: `~/workspace/BehaviorTree.CPP/docs/BT_NODES_XML_REFERENCE_CN.md`

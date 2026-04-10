# GRoot2 Node Editing 实现文档

## 1. 概念区分

| 术语 | 说明 | 触发方式 |
|------|------|---------|
| **NodeInstance** | 画布上的节点实例 | 双击画布节点 → `NodeEditModal` |
| **NodeModel** | 节点类型定义（Palette） | Palette + Add/Edit → `NodeModelModal` |

---

## 2. NodeEditModal — 节点实例编辑器

**触发**: 双击画布节点

### 表单结构

```
┌──────────────────────────────────────────────────┐
│  [NodeType]  #abc123                     [×]    │
├──────────────────────────────────────────────────┤
│  Description: (只读，从 BUILTIN_NODES 查找)       │
├──────────────────────────────────────────────────┤
│  ┌─ Instance ─────────────────────────────────┐  │
│  │ Name (alias): [___________]               │  │  ← Control 节点
│  └────────────────────────────────────────────┘  │
│  ┌─ SubTree ──────────────────────────────────┐  │
│  │ Target Tree: [▼ Select Tree]               │  │  ← SubTree 节点
│  │ ☑ Auto-remap ports by name                 │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ Port Values ──────────────────────────────┐  │
│  │ [goal]    {target_pose}   (input)         │  │
│  │ [msec]    1000            (input)         │  │
│  │ Use {key} for blackboard references         │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ Pre-conditions ───────────────────────────┐  │
│  │ _failureIf:  [__________________________] │  │
│  │ _successIf:  [__________________________] │  │
│  │ _skipIf:     [__________________________] │  │
│  │ _while:      [__________________________] │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ Post-conditions ──────────────────────────┐  │
│  │ _onSuccess: [__________________________]  │  │
│  │ _onFailure: [__________________________]  │  │
│  │ _onHalted:  [__________________________]  │  │
│  │ _post:      [__________________________]  │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  [Cancel]                               [Apply]  │
└──────────────────────────────────────────────────┘
```

### 节点类型显示逻辑

| 节点类型 | Instance (Name) | Port Values | SubTree |
|---------|---------------|-------------|---------|
| Control | ✅ | ❌ | ❌ |
| Decorator | ✅ | ✅ | ❌ |
| Action | ❌ | ✅ | ❌ |
| Condition | ❌ | ✅ | ❌ |
| SubTree | ❌ | ✅ | ✅ |

### Pre-conditions（BT.CPP）

| 属性 | 评估时机 | 行为 |
|------|----------|------|
| `_failureIf` | IDLE→运行时 | true → 立即 FAILURE |
| `_successIf` | IDLE→运行时 | true → 立即 SUCCESS |
| `_skipIf` | IDLE→运行时 | true → 立即 SKIPPED |
| `_while` | IDLE + RUNNING | false → SKIPPED/HALT |

### Post-conditions（BT.CPP）

| 属性 | 执行时机 |
|------|----------|
| `_onSuccess` | SUCCESS 后 |
| `_onFailure` | FAILURE 后 |
| `_onHalted` | HALT 后 |
| `_post` | 任意完成 |

---

## 3. NodeModelModal — 节点模型编辑器

**触发**: Palette "+ Add Custom Node" 或编辑按钮

### Create 模式
```
┌──────────────────────────────────────────────────┐
│  Create Custom Node                        [×]  │
├──────────────────────────────────────────────────┤
│  Node Type*: [MoveToGoal]                       │
│  Category:  [▼ Action]                         │
│  Description: [Move robot to target...]         │
├──────────────────────────────────────────────────┤
│  Port Definitions                    [+ Add Port] │
│  ┌────────────────────────────────────────────┐ │
│  │ Name     Direction Type    Default           │ │
│  │ goal     input   string   {pose}             │ │
│  │ timeout  input   int      1000               │ │
│  └────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  Preview:                                        │
│  ┌─────────────────────────────┐                │
│  │ Action  MoveToGoal           │                │
│  │ IN  goal   = {pose}          │                │
│  │ IN  timeout = 1000           │                │
│  └─────────────────────────────┘                │
├──────────────────────────────────────────────────┤
│  [Cancel]                              [Create]  │
└──────────────────────────────────────────────────┘
```

### Edit 模式（自定义节点）
- Node Type / Category 灰显（不可改）
- 底部有 **Delete** 按钮

### 端口类型（portType）
- `string` — 字符串
- `int` / `unsigned` — 整数
- `bool` — 布尔
- `double` — 浮点数
- `NodeStatus` — 节点状态枚举
- `Any` — 任意类型

---

## 4. Canvas 节点 UI 增强

### 端口分组显示

```
┌──────────────────────────────┐
│     [Decorator]              │
│     Timeout                  │
│ ─────────────────────────── │
│ IN  msec:     1000          │  ← input
│ OUT result:   {res}          │  ← output
└──────────────────────────────┘
```

### Pre/Post-condition 指示器

- ⏱ — 节点有 pre-conditions
- ↩ — 节点有 post-conditions

---

## 5. 数据结构

### BTTreeNode（BTTreeNodeInstance）
```typescript
interface BTTreeNode {
  id: string;
  type: string;
  name?: string;           // 实例别名
  ports: Record<string, string>;  // 端口当前值
  children: BTTreeNode[];
  // 新增
  preconditions?: Record<string, string>;   // _successIf, _failureIf, etc.
  postconditions?: Record<string, string>;  // _onSuccess, _onFailure, etc.
}
```

### BTPort（节点模型端口定义）
```typescript
interface BTPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  portType?: string;        // int, string, bool, double, NodeStatus, Any
  description?: string;
  defaultValue?: string;
}
```

---

## 6. 已实现功能清单

- [x] NodeEditModal 4区块表单（Instance/Port/Pre/Post）
- [x] NodeModelModal 端口定义（含 portType）
- [x] Pre-conditions 序列化/反序列化
- [x] Post-conditions 序列化/反序列化
- [x] SubTree 目标选择 + auto-remap
- [x] 端口按方向分组显示（IN/OUT/IO）
- [x] Pre/Post-condition 视觉指示器
- [x] BUILTIN_NODES 端口定义查找（方向、类型）
- [x] 数字端口识别为 number 输入
- [x] store action `updateNodeConditions`

---

## 7. 文件清单

| 文件 | 改动 |
|------|------|
| `src/types/bt.ts` | BTTreeNode/BTPort 新增字段 |
| `src/types/bt-constants.ts` | EDITOR_ROOT_TYPE, PORT_TYPES |
| `src/utils/btXml.ts` | 序列化/反序列化 pre/post-conditions |
| `src/utils/btFlow.ts` | treeToFlow/flowToTree 含 pre/post |
| `src/store/btStore.ts` | updateNodeConditions action |
| `src/components/NodeEditModal.tsx` | 4区块表单 |
| `src/components/NodeModelModal.tsx` | portType 支持 |
| `src/components/nodes/BTFlowNode.tsx` | 端口分组 + 指示器 |
| `App.css` | edit-section/condition-row 样式 |

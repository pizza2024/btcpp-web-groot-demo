# GRoot2 Node Editing 设计方案

## 1. 核心概念区分

### NodeModel（节点模型定义）
描述一个节点类型的元数据，存在于 Palette 中，影响所有该类型节点。

| 字段 | 说明 | 示例 |
|------|------|------|
| `type` | 节点类型唯一标识 | `MoveToGoal` |
| `category` | 大类 | `Action` |
| `builtin` | 是否内置 | `true` |
| `description` | 描述 | `Move robot to target` |
| `ports` | 端口定义列表 | `[ {name, direction, type, defaultValue, description} ]` |

### NodeInstance（节点实例）
画布上实际存在的节点，是 NodeModel 的具体使用。

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 实例唯一 ID | `n_abc123` |
| `type` | 引用的模型类型 | `MoveToGoal` |
| `name` | 实例别名（可选） | `MoveToGoal_1` |
| `ports` | 端口当前值 | `{ goal: "{target_pose}" }` |
| `preconditions` | 前置条件 | `{ _successIf: "is_ready" }` |
| `postconditions` | 后置条件 | `{ _onSuccess: "done := true" }` |

---

## 2. GRoot2 Pre/Post-Conditions（BT.CPP 规范）

### Pre-conditions（前置条件）
在节点 `tick()` 执行前评估，可立即短路返回状态。

| 属性 | 评估时机 | 行为 |
|------|----------|------|
| `_failureIf` | 仅 IDLE→运行时 | 为 true → 立即返回 FAILURE |
| `_successIf` | 仅 IDLE→运行时 | 为 true → 立即返回 SUCCESS |
| `_skipIf` | 仅 IDLE→运行时 | 为 true → 立即返回 SKIPPED |
| `_while` | IDLE 和 RUNNING | false → SKIPPED/HALT；运行时变 false → HALT |

### Post-conditions（后置条件）
节点完成后执行的脚本。

| 属性 | 执行时机 |
|------|----------|
| `_onSuccess` | 返回 SUCCESS 后 |
| `_onFailure` | 返回 FAILURE 后 |
| `_onHalted` | 被 HALT 后 |
| `_post` | 任意完成（SUCCESS/FAILURE/HALTED） |

### XML 示例
```xml
<Action ID="MoveToGoal"
  _successIf="is_battery_ok"
  _onSuccess="last_goal := {goal}"
  _onFailure="error_count += 1">
  <output_port name="result">Navigation result</output_port>
</Action>
```

---

## 3. BT.CPP Port 类型系统

### 端口方向
- `input` — 输入端口
- `output` — 输出端口
- `inout` — 双向端口

### 端口类型
- `string` — 字符串
- `int` / `unsigned` — 整数
- `double` — 浮点数
- `bool` — 布尔
- `NodeStatus` — 节点状态枚举
- `Any` — 任意类型（弱类型）

### Port 连接规则
1. **同类型** — 总是兼容
2. **弱类型端口** — 可连接任意类型
3. **字符串** — 可转换为任意有 `convertFromString<T>()` 的类型
4. **强类型锁定** — 黑色板条目一旦写入强类型值，类型锁定

---

## 4. 界面设计

### 4.1 NodeEditModal — 节点实例编辑器

**触发方式**: 双击画布节点

**布局**:
```
┌─────────────────────────────────────────┐
│  [NodeType]  #abc123          [×]      │  ← Header: 类型 + ID
├─────────────────────────────────────────┤
│  Description: Move robot to target      │  ← 只读描述
├─────────────────────────────────────────┤
│  ┌─ Instance ─────────────────────────┐  │
│  │ Name (alias): [MoveToGoal_1    ]  │  │  ← Control/Decorator 专用
│  └───────────────────────────────────┘  │
│  ┌─ Port Values ─────────────────────┐  │
│  │ [goal]  {target_pose}             │  │  ← 所有有端口的节点
│  │ [timeout] 1000                    │  │
│  └───────────────────────────────────┘  │
│  ┌─ Pre-conditions ──────────────────┐  │
│  │ _successIf: [is_battery_ok     ]  │  │
│  │ _failureIf: [is_obstacle      ]  │  │
│  │ _skipIf:    [is_simulated     ]  │  │
│  │ _while:     [safety_check     ]  │  │
│  └───────────────────────────────────┘  │
│  ┌─ Post-conditions ─────────────────┐  │
│  │ _onSuccess: [result := ok    ]  │  │
│  │ _onFailure: [result := fail  ]  │  │
│  │ _onHalted:  [result := halt  ]  │  │
│  │ _post:      [cleanup        ]  │  │
│  └───────────────────────────────────┘  │
│  ┌─ SubTree Settings ────────────────┐  │  ← 仅 SubTree
│  │ Target: [▼ Select Tree        ]  │  │
│  │ ☑ Auto-remap ports by name       │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  [Cancel]                    [Apply]    │
└─────────────────────────────────────────┘
```

**各节点类型显示内容**:

| 节点类型 | Name | Port Values | Pre-cond | Post-cond | SubTree |
|---------|------|------------|----------|-----------|---------|
| Control | ✅ | ❌ | ✅ | ✅ | ❌ |
| Decorator | ✅ | ✅ | ✅ | ✅ | ❌ |
| Action | ❌ | ✅ | ✅ | ✅ | ❌ |
| Condition | ❌ | ✅ | ✅ | ✅ | ❌ |
| SubTree | ❌ | ✅ | ✅ | ✅ | ✅ |

### 4.2 NodeModelModal — 节点模型编辑器

**触发方式**: Palette "+ Add Custom Node" 或编辑按钮

**Create 模式**:
```
┌─────────────────────────────────────────┐
│  Create Custom Node             [×]      │
├─────────────────────────────────────────┤
│  Node Type*: [MoveToGoal        ]       │
│  Category:  [▼ Action           ]       │
│  Description: [Move robot to...  ]      │
├─────────────────────────────────────────┤
│  Port Definitions           [+ Add Port] │
│  ┌───────────────────────────────────┐  │
│  │ [Name     ] [▼ Dir] [Default]      │  │
│  │ goal      input  {pose}            │  │
│  │ timeout   input  1000              │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Preview: [MoveToGoal]  Action          │
│           goal: input = {pose}          │
│           timeout: input = 1000         │
├─────────────────────────────────────────┤
│  [Cancel]                      [Create] │
└─────────────────────────────────────────┘
```

**Edit 模式**（自定义节点）:
- Node Type 灰显（不可改）
- Category 灰显（不可改）
- 其他字段可编辑
- 底部有 **Delete** 按钮

### 4.3 Canvas 节点端口 UI

**当前状态**: 节点底部显示端口名和值的摘要列表

**改进方案**: 按端口方向分组显示

```
┌──────────────────────────┐
│     [Decorator]          │
│     Timeout              │
│ ──────────────────────── │
│ IN  │ msec:     1000    │  ← input 端口
│ OUT │ result:   {res}    │  ← output 端口
│ IO  │ data:     {io}     │  ← inout 端口
└──────────────────────────┘
```

**视觉增强**:
- 输入端口标记 `IN`
- 输出端口标记 `OUT`
- 双向端口标记 `IO`
- 有值的端口高亮显示
- 无值的端口灰色显示

---

## 5. 数据结构变更

### 5.1 BTTreeNode 扩展

```typescript
// src/types/bt.ts

interface BTTreeNode {
  id: string;
  type: string;
  name?: string;          // 实例别名
  ports: Record<string, string>;   // 端口当前值
  children: BTTreeNode[];
  // 新增
  preconditions?: Record<string, string>;   // _successIf, _failureIf, etc.
  postconditions?: Record<string, string>;   // _onSuccess, _onFailure, etc.
}
```

### 5.2 BTPortDefinition 扩展

```typescript
// src/types/bt.ts

interface BTPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  description?: string;
  defaultValue?: string;
  // 新增
  portType?: string;      // int, string, bool, double, etc.
}
```

---

## 6. Store 变更

### 6.1 btStore.ts

```typescript
// 新增 actions
updateNodeConditions: (
  nodeId: string,
  preconditions?: Record<string, string>,
  postconditions?: Record<string, string>
) => void;

// 修改
updateNodePorts: (nodeId: string, ports: Record<string, string>) => void;
// updateNodeName 已存在
```

---

## 7. 序列化变更

### 7.1 btXml.ts — 导出

```typescript
// serializeNode 中增加 preconditions/postconditions 序列化
if (node.preconditions) {
  Object.entries(node.preconditions).forEach(([k, v]) => {
    attrs.push(`${k}="${escapeXml(v)}"`);
  });
}
if (node.postconditions) {
  Object.entries(node.postconditions).forEach(([k, v]) => {
    attrs.push(`${k}="${escapeXml(v)}"`);
  });
}
```

### 7.2 btXml.ts — 导入

```typescript
// parseTreeNode 中解析 preconditions/postconditions
const preconditions: Record<string, string> = {};
const postconditions: Record<string, string> = {};
['_failureIf', '_successIf', '_skipIf', '_while'].forEach(key => {
  const val = el.getAttribute(key);
  if (val) preconditions[key] = val;
});
['_onSuccess', '_onFailure', '_onHalted', '_post'].forEach(key => {
  const val = el.getAttribute(key);
  if (val) postconditions[key] = val;
});
```

---

## 8. 实现计划

### Phase 1: 数据结构扩展
1. 扩展 `BTTreeNode` 类型，增加 `preconditions`/`postconditions`
2. 扩展 `BTPort` 类型，增加 `portType`
3. 更新 `btXml.ts` 的序列化/反序列化

### Phase 2: NodeEditModal 重构
1. 重组表单为 4 个区块：Instance / Port Values / Pre-conditions / Post-conditions
2. 实现各节点类型的条件字段显示逻辑
3. SubTree 特殊处理
4. 数字/字符串端口值输入区分

### Phase 3: NodeModelModal 增强
1. 端口定义增加 `portType` 下拉选择
2. 端口定义表支持增删改
3. 实时预览

### Phase 4: Canvas 节点 UI 增强
1. 按方向分组显示端口（IN/OUT/IO）
2. 端口值视觉高亮
3. Pre/Post-condition 视觉指示器

---

## 9. 文件改动清单

| 文件 | 改动 |
|------|------|
| `src/types/bt.ts` | 扩展 `BTTreeNode`, `BTPort` 接口 |
| `src/utils/btXml.ts` | 序列化/反序列化 preconditions/postconditions |
| `src/store/btStore.ts` | 新增 `updateNodeConditions` action |
| `src/components/NodeEditModal.tsx` | 重组为 4 区块表单 |
| `src/components/NodeModelModal.tsx` | 端口定义增加 portType |
| `src/components/nodes/BTFlowNode.tsx` | 端口分组显示 |
| `src/components/BTCanvas.tsx` | 传递完整节点数据 |
| `App.css` | 端口分组样式、pre/post-condition 样式 |

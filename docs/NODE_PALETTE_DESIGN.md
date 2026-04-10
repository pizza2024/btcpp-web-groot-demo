# Node Palette 分类与节点定义设计方案

## 1. 五大节点类别 (参考 GRoot2 / BT.CPP)

| 类别 | 说明 | 约束 |
|------|------|------|
| **Control** | 控制节点 | 1 个或多个子节点 |
| **Decorator** | 装饰节点 | 必须恰好 1 个子节点 |
| **Action** | 动作节点（叶子） | 不能有子节点 |
| **Condition** | 条件节点（叶子） | 不能有子节点 |
| **SubTree** | 子树节点 | 引用另一棵树，不能直接挂子节点 |

---

## 2. BT.CPP 内置节点清单

### 2.1 Control 内置节点

| 节点类型 | 端口定义 |
|----------|----------|
| **Sequence** | 无 |
| **Fallback** | 无 |
| **SequenceWithMemory** | 无 |
| **ReactiveSequence** | 无 |
| **ReactiveFallback** | 无 |
| **Parallel** | `success_count` (int, default=-1), `failure_count` (int, default=1) |
| **ParallelAll** | `max_failures` (int, default=1) |
| **IfThenElse** | 无 |
| **WhileDoElse** | 无 |
| **TryCatch** | `catch_on_halt` (bool, default=false) |
| **Switch2/Switch3/Switch4/Switch5/Switch6** | `variable` (string), `case_1`...`case_N` (string) |
| **ManualSelector** | `repeat_last_selection` (bool, default=false) |
| **AsyncSequence** | 无 |
| **AsyncFallback** | 无 |

### 2.2 Decorator 内置节点

| 节点类型 | 端口定义 |
|----------|----------|
| **Inverter** | 无 |
| **ForceSuccess** | 无 |
| **ForceFailure** | 无 |
| **KeepRunningUntilFailure** | 无 |
| **Repeat** | `num_cycles` (int, default=-1 表示无限) |
| **RetryUntilSuccessful** | `num_attempts` (int, default=-1 表示无限) |
| **Timeout** | `msec` (unsigned) |
| **Delay** | `delay_msec` (unsigned) |
| **RunOnce** | `then_skip` (bool, default=true) |
| **Precondition** | `if` (string script), `else` (NodeStatus) |
| **LoopInt/LoopBool/LoopDouble/LoopString** | `queue` (inout), `if_empty` (NodeStatus), `value` (output) |
| **SkipUnlessUpdated** | `entry` (Any) |
| **WaitValueUpdate** | `entry` (Any) |
| **SubTree** | `_autoremap` (bool), 其余属性为端口重映射 |

### 2.3 Action 内置节点

| 节点类型 | 端口定义 |
|----------|----------|
| **AlwaysSuccess** | 无 |
| **AlwaysFailure** | 无 |
| **Script** | `code` (string) |
| **SetBlackboard** | `value` (input), `output_key` (bidirectional) |
| **Sleep** | `msec` (unsigned) |
| **UnsetBlackboard** | `key` (string) |
| **WasEntryUpdated** | `entry` (Any) |

### 2.4 Condition 内置节点

| 节点类型 | 端口定义 |
|----------|----------|
| **ScriptCondition** | `code` (string) |

### 2.5 SubTree 内置节点

| 节点类型 | 端口定义 |
|----------|----------|
| **SubTree** | `_autoremap` (bool), 其余属性为端口重映射 |

---

## 3. 节点定义数据结构设计

```typescript
// 端口方向
type PortDirection = 'input' | 'output' | 'inout';

// 端口定义（模板/元数据）
interface PortDefinition {
  name: string;
  direction: PortDirection;
  description?: string;
  defaultValue?: string;
  type?: string;  // 如 "int", "string", "bool", "unsigned", "NodeStatus", "Any"
}

// 节点定义（模板/元数据）
interface BTNodeDefinition {
  type: string;           // 节点类型名称，如 "Sequence", "MoveToGoal"
  category: 'Control' | 'Decorator' | 'Action' | 'Condition' | 'SubTree';
  builtin?: boolean;      // 是否内置节点
  description?: string;   // 节点描述
  ports?: PortDefinition[];  // 端口模板定义
  childConstraint?: 'exactly_one' | 'at_least_one' | 'unlimited' | 'none';
}

// 实例节点（树中实际节点）
interface BTTreeNode {
  id: string;
  type: string;
  name?: string;           // 实例名称/别名
  ports: Record<string, string>;  // 端口名 -> 当前值
  children: BTTreeNode[];
}
```

---

## 4. 节点创建/编辑表单设计

### 4.1 基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| **Node Type** | 文本输入 | 节点类型名称，如 `MoveToGoal` |
| **Category** | 下拉选择 | Control / Decorator / Action / Condition / SubTree |
| **Description** | 文本输入 | 节点描述（可选） |

### 4.2 端口定义（可添加多个）

| 字段 | 类型 | 说明 |
|------|------|------|
| **Port Name** | 文本输入 | 端口名称，如 `msec`, `num_attempts` |
| **Direction** | 下拉选择 | Input / Output / InOut |
| **Type** | 下拉选择 | int / unsigned / bool / string / NodeStatus / Any / (其他) |
| **Default Value** | 文本输入 | 默认值，如 `3`, `-1`, `true` |
| **Description** | 文本输入 | 端口用途说明（可选） |

**Direction 下拉选项（4种）：**
- `input` - 输入端口
- `output` - 输出端口
- `inout` - 双向端口

**Type 下拉选项：**
- `int` - 整数
- `unsigned` - 无符号整数
- `bool` - 布尔值
- `string` - 字符串
- `NodeStatus` - 节点状态 (SUCCESS/FAILURE/RUNNING)
- `Any` - 任意类型（黑板键）
- `double` - 浮点数

**约束：**
- SubTree 类型的节点，端口定义为端口重映射，无需 Direction 下拉
- Control 类型节点通常不需要定义端口（除非有特殊参数如 Parallel）
- Action/Condition 节点可自定义端口

### 4.3 界面交互

1. **添加端口**：点击 "+ Add Port" 按钮添加新端口
2. **删除端口**：每行端口右侧有删除按钮
3. **拖拽排序**：端口可拖拽调整顺序
4. **实时预览**：表单下方显示当前定义的预览

---

## 5. UI 组件设计

### 5.1 Node Palette 分组展示

```
▼ Control (15)
  Sequence, Fallback, Parallel, ...

▼ Decorator (14)
  Inverter, ForceSuccess, RetryUntilSuccessful, ...

▼ Action (7)
  AlwaysSuccess, AlwaysFailure, SetBlackboard, ...

▼ Condition (1)
  ScriptCondition

▼ SubTree (1)
  SubTree
```

### 5.2 添加自定义节点按钮

在 Node Palette 底部：
- 点击 "Add Custom Node" 展开/收起表单
- 填写节点类型、类别、描述
- 定义端口（可选）
- 点击 "Create" 创建节点到对应分类

### 5.3 节点右键菜单（新增/编辑）

- **Edit Node** - 打开编辑对话框（仅自定义节点）
- **Delete Node** - 删除自定义节点（内置节点不可删除）

---

## 6. 实现计划

### Phase 1: 更新内置节点数据
- [ ] 更新 `bt-constants.ts`，添加所有 Control/Decorator 内置节点及其端口
- [ ] 添加 Condition 内置节点
- [ ] 更新 NodePalette 按五大类分组展示

### Phase 2: 自定义节点创建/编辑表单
- [ ] 添加 "Add Custom Node" 展开式表单
- [ ] 实现多端口添加/删除/排序
- [ ] 端口 Direction/Type 下拉选项

### Phase 3: 节点编辑对话框
- [ ] 双击 Palette 中的自定义节点打开编辑
- [ ] 右键菜单添加 Edit/Delete 选项
- [ ] 保存后同步更新 nodeModels

### Phase 4: XML 导入/导出
- [ ] 自定义节点定义序列化到 `<TreeNodesModel>`
- [ ] 导入时正确解析自定义节点及其端口

---

## 7. 参考资料

- BT.CPP 内置节点文档: `BehaviorTree.CPP/docs/BT_NODES_XML_REFERENCE_CN.md`
- GRoot2 协议: `BehaviorTree.CPP/include/behaviortree_cpp_v2/loggers/groot2_protocol.h`

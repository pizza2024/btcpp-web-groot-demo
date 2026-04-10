import type { BTNodeDefinition } from './bt';

// BT.CPP 内置节点清单 (参考 GRoot2 / BT.NODES_XML_REFERENCE_CN.md)
export const BUILTIN_NODES: BTNodeDefinition[] = [
  // ─── Control 节点 ─────────────────────────────────────────────────────────
  {
    type: 'Sequence',
    category: 'Control',
    builtin: true,
    description: 'All children must succeed (→)',
  },
  {
    type: 'Fallback',
    category: 'Control',
    builtin: true,
    description: 'First success wins (?)',
  },
  {
    type: 'SequenceWithMemory',
    category: 'Control',
    builtin: true,
    description: 'Sequence that remembers last running child',
  },
  {
    type: 'ReactiveSequence',
    category: 'Control',
    builtin: true,
    description: 'Re-checks previous on RUNNING',
  },
  {
    type: 'ReactiveFallback',
    category: 'Control',
    builtin: true,
    description: 'Re-checks previous on RUNNING',
  },
  {
    type: 'Parallel',
    category: 'Control',
    builtin: true,
    description: 'Run children in parallel',
    ports: [
      { name: 'success_count', direction: 'input', description: 'Required successes (-1=all)', defaultValue: '-1' },
      { name: 'failure_count', direction: 'input', description: 'Required failures', defaultValue: '1' },
    ],
  },
  {
    type: 'ParallelAll',
    category: 'Control',
    builtin: true,
    description: 'All children must succeed or fail together',
    ports: [
      { name: 'max_failures', direction: 'input', description: 'Max failures allowed', defaultValue: '1' },
    ],
  },
  {
    type: 'IfThenElse',
    category: 'Control',
    builtin: true,
    description: 'If[0] then[1] else[2]',
  },
  {
    type: 'WhileDoElse',
    category: 'Control',
    builtin: true,
    description: 'While[0] do[1] else[2]',
  },
  {
    type: 'TryCatch',
    category: 'Control',
    builtin: true,
    description: 'Try...catch pattern',
    ports: [
      { name: 'catch_on_halt', direction: 'input', description: 'Catch when halted', defaultValue: 'false' },
    ],
  },
  {
    type: 'Switch2',
    category: 'Control',
    builtin: true,
    description: 'Switch on variable (2 cases)',
    ports: [
      { name: 'variable', direction: 'input', description: 'Variable to switch on' },
      { name: 'case_1', direction: 'input', description: 'Value for case 1' },
      { name: 'case_2', direction: 'input', description: 'Value for case 2' },
    ],
  },
  {
    type: 'Switch3',
    category: 'Control',
    builtin: true,
    description: 'Switch on variable (3 cases)',
    ports: [
      { name: 'variable', direction: 'input', description: 'Variable to switch on' },
      { name: 'case_1', direction: 'input', description: 'Value for case 1' },
      { name: 'case_2', direction: 'input', description: 'Value for case 2' },
      { name: 'case_3', direction: 'input', description: 'Value for case 3' },
    ],
  },
  {
    type: 'Switch4',
    category: 'Control',
    builtin: true,
    description: 'Switch on variable (4 cases)',
    ports: [
      { name: 'variable', direction: 'input', description: 'Variable to switch on' },
      { name: 'case_1', direction: 'input', description: 'Value for case 1' },
      { name: 'case_2', direction: 'input', description: 'Value for case 2' },
      { name: 'case_3', direction: 'input', description: 'Value for case 3' },
      { name: 'case_4', direction: 'input', description: 'Value for case 4' },
    ],
  },
  {
    type: 'Switch5',
    category: 'Control',
    builtin: true,
    description: 'Switch on variable (5 cases)',
    ports: [
      { name: 'variable', direction: 'input', description: 'Variable to switch on' },
      { name: 'case_1', direction: 'input', description: 'Value for case 1' },
      { name: 'case_2', direction: 'input', description: 'Value for case 2' },
      { name: 'case_3', direction: 'input', description: 'Value for case 3' },
      { name: 'case_4', direction: 'input', description: 'Value for case 4' },
      { name: 'case_5', direction: 'input', description: 'Value for case 5' },
    ],
  },
  {
    type: 'Switch6',
    category: 'Control',
    builtin: true,
    description: 'Switch on variable (6 cases)',
    ports: [
      { name: 'variable', direction: 'input', description: 'Variable to switch on' },
      { name: 'case_1', direction: 'input', description: 'Value for case 1' },
      { name: 'case_2', direction: 'input', description: 'Value for case 2' },
      { name: 'case_3', direction: 'input', description: 'Value for case 3' },
      { name: 'case_4', direction: 'input', description: 'Value for case 4' },
      { name: 'case_5', direction: 'input', description: 'Value for case 5' },
      { name: 'case_6', direction: 'input', description: 'Value for case 6' },
    ],
  },
  {
    type: 'ManualSelector',
    category: 'Control',
    builtin: true,
    description: 'Manually select which child to run',
    ports: [
      { name: 'repeat_last_selection', direction: 'input', description: 'Repeat last selected child', defaultValue: 'false' },
    ],
  },
  {
    type: 'AsyncSequence',
    category: 'Control',
    builtin: true,
    description: 'Async sequence',
  },
  {
    type: 'AsyncFallback',
    category: 'Control',
    builtin: true,
    description: 'Async fallback',
  },

  // ─── Decorator 节点 ────────────────────────────────────────────────────────
  {
    type: 'Inverter',
    category: 'Decorator',
    builtin: true,
    description: 'Invert child result',
  },
  {
    type: 'ForceSuccess',
    category: 'Decorator',
    builtin: true,
    description: 'Always SUCCESS',
  },
  {
    type: 'ForceFailure',
    category: 'Decorator',
    builtin: true,
    description: 'Always FAILURE',
  },
  {
    type: 'KeepRunningUntilFailure',
    category: 'Decorator',
    builtin: true,
    description: 'Loop until FAILURE',
  },
  {
    type: 'Repeat',
    category: 'Decorator',
    builtin: true,
    description: 'Repeat successful child N times',
    ports: [
      { name: 'num_cycles', direction: 'input', description: 'Number of cycles (-1=infinite)', defaultValue: '-1' },
    ],
  },
  {
    type: 'RetryUntilSuccessful',
    category: 'Decorator',
    builtin: true,
    description: 'Retry until SUCCESS',
    ports: [
      { name: 'num_attempts', direction: 'input', description: 'Max attempts (-1=infinite)', defaultValue: '-1' },
    ],
  },
  {
    type: 'Timeout',
    category: 'Decorator',
    builtin: true,
    description: 'Cancel child after timeout',
    ports: [
      { name: 'msec', direction: 'input', description: 'Timeout in milliseconds', defaultValue: '1000' },
    ],
  },
  {
    type: 'Delay',
    category: 'Decorator',
    builtin: true,
    description: 'Delay before ticking child',
    ports: [
      { name: 'delay_msec', direction: 'input', description: 'Delay in milliseconds', defaultValue: '100' },
    ],
  },
  {
    type: 'RunOnce',
    category: 'Decorator',
    builtin: true,
    description: 'Tick child only once',
    ports: [
      { name: 'then_skip', direction: 'input', description: 'Skip subsequent ticks', defaultValue: 'true' },
    ],
  },
  {
    type: 'Precondition',
    category: 'Decorator',
    builtin: true,
    description: 'Check condition before running child',
    ports: [
      { name: 'if', direction: 'input', description: 'Condition script (if true → tick child)' },
      { name: 'else', direction: 'input', description: 'Status to return if condition false', defaultValue: 'FAILURE' },
    ],
  },
  {
    type: 'LoopInt',
    category: 'Decorator',
    builtin: true,
    description: 'Loop over integer queue',
    ports: [
      { name: 'queue', direction: 'inout', description: 'Queue of integers' },
      { name: 'if_empty', direction: 'input', description: 'Status when queue empty', defaultValue: 'SUCCESS' },
      { name: 'value', direction: 'output', description: 'Current item from queue' },
    ],
  },
  {
    type: 'LoopBool',
    category: 'Decorator',
    builtin: true,
    description: 'Loop over boolean queue',
    ports: [
      { name: 'queue', direction: 'inout', description: 'Queue of booleans' },
      { name: 'if_empty', direction: 'input', description: 'Status when queue empty', defaultValue: 'SUCCESS' },
      { name: 'value', direction: 'output', description: 'Current item from queue' },
    ],
  },
  {
    type: 'LoopDouble',
    category: 'Decorator',
    builtin: true,
    description: 'Loop over double/float queue',
    ports: [
      { name: 'queue', direction: 'inout', description: 'Queue of doubles' },
      { name: 'if_empty', direction: 'input', description: 'Status when queue empty', defaultValue: 'SUCCESS' },
      { name: 'value', direction: 'output', description: 'Current item from queue' },
    ],
  },
  {
    type: 'LoopString',
    category: 'Decorator',
    builtin: true,
    description: 'Loop over string queue',
    ports: [
      { name: 'queue', direction: 'inout', description: 'Queue of strings' },
      { name: 'if_empty', direction: 'input', description: 'Status when queue empty', defaultValue: 'SUCCESS' },
      { name: 'value', direction: 'output', description: 'Current item from queue' },
    ],
  },
  {
    type: 'SkipUnlessUpdated',
    category: 'Decorator',
    builtin: true,
    description: 'Skip unless blackboard entry was updated',
    ports: [
      { name: 'entry', direction: 'input', description: 'Blackboard key to check' },
    ],
  },
  {
    type: 'WaitValueUpdate',
    category: 'Decorator',
    builtin: true,
    description: 'Wait for blackboard entry to be updated',
    ports: [
      { name: 'entry', direction: 'input', description: 'Blackboard key to wait for' },
    ],
  },

  // ─── Action 节点 ───────────────────────────────────────────────────────────
  {
    type: 'AlwaysSuccess',
    category: 'Action',
    builtin: true,
    description: 'Always return SUCCESS',
  },
  {
    type: 'AlwaysFailure',
    category: 'Action',
    builtin: true,
    description: 'Always return FAILURE',
  },
  {
    type: 'Script',
    category: 'Action',
    builtin: true,
    description: 'Execute script',
    ports: [
      { name: 'code', direction: 'input', description: 'Script code to execute' },
    ],
  },
  {
    type: 'SetBlackboard',
    category: 'Action',
    builtin: true,
    description: 'Set a blackboard value',
    ports: [
      { name: 'value', direction: 'input', description: 'Value to set' },
      { name: 'output_key', direction: 'output', description: 'Blackboard key to set' },
    ],
  },
  {
    type: 'Sleep',
    category: 'Action',
    builtin: true,
    description: 'Sleep for specified time',
    ports: [
      { name: 'msec', direction: 'input', description: 'Sleep duration in milliseconds', defaultValue: '500' },
    ],
  },
  {
    type: 'UnsetBlackboard',
    category: 'Action',
    builtin: true,
    description: 'Unset a blackboard entry',
    ports: [
      { name: 'key', direction: 'input', description: 'Blackboard key to unset' },
    ],
  },
  {
    type: 'WasEntryUpdated',
    category: 'Action',
    builtin: true,
    description: 'Check if blackboard entry was updated',
    ports: [
      { name: 'entry', direction: 'input', description: 'Blackboard key to check' },
    ],
  },

  // ─── Condition 节点 ────────────────────────────────────────────────────────
  {
    type: 'ScriptCondition',
    category: 'Condition',
    builtin: true,
    description: 'Evaluate script as condition',
    ports: [
      { name: 'code', direction: 'input', description: 'Script expression (result must be bool)' },
    ],
  },

  // ─── SubTree 节点 ───────────────────────────────────────────────────────────
  {
    type: 'SubTree',
    category: 'SubTree',
    builtin: true,
    description: 'Reference to another behavior tree',
    ports: [
      { name: '__autoremap', direction: 'input', description: 'Auto-remap ports by name', defaultValue: 'false' },
    ],
  },
];

// 分类颜色配置
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Control:   { bg: '#2d4a7a', border: '#4a80d0', text: '#c8e0ff' },
  Decorator: { bg: '#4a2d7a', border: '#9a6fca', text: '#e0c8ff' },
  Action:    { bg: '#2d6e3e', border: '#4ab86b', text: '#c8f0d8' },
  Condition: { bg: '#6e4a2d', border: '#d09a40', text: '#fff0c8' },
  SubTree:   { bg: '#5a2d7a', border: '#9a40d0', text: '#f0c8ff' },
};

// 状态颜色
export const STATUS_COLORS: Record<string, string> = {
  IDLE:    '#888',
  RUNNING: '#f0a020',
  SUCCESS: '#40c060',
  FAILURE: '#e04040',
};

// 端口方向选项（用于表单下拉）
export const PORT_DIRECTIONS = [
  { value: 'input', label: 'Input' },
  { value: 'output', label: 'Output' },
  { value: 'inout', label: 'InOut' },
] as const;

// 端口类型选项（用于表单下拉）
export const PORT_TYPES = [
  { value: 'string', label: 'string' },
  { value: 'int', label: 'int' },
  { value: 'unsigned', label: 'unsigned' },
  { value: 'bool', label: 'bool' },
  { value: 'double', label: 'double' },
  { value: 'NodeStatus', label: 'NodeStatus' },
  { value: 'Any', label: 'Any (Blackboard)' },
] as const;

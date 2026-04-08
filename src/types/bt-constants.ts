import type { BTNodeDefinition } from './bt';

export const BUILTIN_NODES: BTNodeDefinition[] = [
  // --- Control ---
  { type: 'Sequence',           category: 'Control',   builtin: true, description: 'All children must succeed (→)' },
  { type: 'Fallback',           category: 'Control',   builtin: true, description: 'First success wins (?)' },
  { type: 'Parallel',           category: 'Control',   builtin: true, description: 'Run children in parallel',
    ports: [
      { name: 'success_count', direction: 'input', description: 'Required successes' },
      { name: 'failure_count', direction: 'input', description: 'Required failures' },
    ],
  },
  { type: 'ReactiveSequence',   category: 'Control',   builtin: true, description: 'Re-checks previous on RUNNING' },
  { type: 'ReactiveFallback',   category: 'Control',   builtin: true, description: 'Re-checks previous on RUNNING' },
  { type: 'WhileDoElse',        category: 'Control',   builtin: true, description: 'While[0] do[1] else[2]' },
  { type: 'IfThenElse',         category: 'Control',   builtin: true, description: 'If[0] then[1] else[2]' },
  { type: 'Switch2',            category: 'Control',   builtin: true, description: 'Switch on variable (2 cases)' },

  // --- Decorator ---
  { type: 'Inverter',                   category: 'Decorator', builtin: true, description: 'Invert child result' },
  { type: 'ForceSuccess',               category: 'Decorator', builtin: true, description: 'Always SUCCESS' },
  { type: 'ForceFailure',               category: 'Decorator', builtin: true, description: 'Always FAILURE' },
  { type: 'KeepRunningUntilFailure',    category: 'Decorator', builtin: true, description: 'Loop until FAILURE' },
  { type: 'Repeat',                     category: 'Decorator', builtin: true, description: 'Repeat N times',
    ports: [{ name: 'num_cycles', direction: 'input', description: 'Number of cycles' }],
  },
  { type: 'RetryUntilSuccessful',       category: 'Decorator', builtin: true, description: 'Retry until SUCCESS',
    ports: [{ name: 'num_attempts', direction: 'input', description: 'Max attempts' }],
  },
  { type: 'Timeout',                    category: 'Decorator', builtin: true, description: 'Cancel after timeout',
    ports: [{ name: 'msec', direction: 'input', description: 'Timeout in ms' }],
  },
  { type: 'Delay',                      category: 'Decorator', builtin: true, description: 'Delay then tick',
    ports: [{ name: 'delay_msec', direction: 'input', description: 'Delay ms' }],
  },
  { type: 'RunOnce',                    category: 'Decorator', builtin: true, description: 'Tick child only once' },
  { type: 'SubTree',                    category: 'SubTree',   builtin: true, description: 'Reference to another tree',
    ports: [{ name: '__shared_blackboard', direction: 'input', description: 'Share BB with parent' }],
  },
];

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Control:   { bg: '#2d4a7a', border: '#4a80d0', text: '#c8e0ff' },
  Decorator: { bg: '#4a2d7a', border: '#9a6fca', text: '#e0c8ff' },
  Leaf:      { bg: '#2d6e3e', border: '#4ab86b', text: '#c8f0d8' },
  SubTree:   { bg: '#7a5a2d', border: '#d09a40', text: '#fff0c8' },
};

export const STATUS_COLORS: Record<string, string> = {
  IDLE:    '#888',
  RUNNING: '#f0a020',
  SUCCESS: '#40c060',
  FAILURE: '#e04040',
};

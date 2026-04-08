export type BTNodeCategory = 'Control' | 'Decorator' | 'Leaf' | 'SubTree';
export type NodeStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE';

export interface BTPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  description?: string;
}

export interface BTNodeDefinition {
  type: string;
  category: BTNodeCategory;
  ports?: BTPort[];
  description?: string;
  /** built-in nodes don't appear in TreeNodesModel export */
  builtin?: boolean;
}

export interface BTTreeNode {
  id: string;
  type: string;
  name?: string;        // instance name / alias
  ports: Record<string, string>;  // port name -> value/BB key
  children: BTTreeNode[];
}

export interface BTTree {
  id: string;
  root: BTTreeNode;
}

export interface BTProject {
  trees: BTTree[];
  nodeModels: BTNodeDefinition[];
  mainTreeId: string;
}

export interface DebugLogEntry {
  timestamp: number;
  nodeUid: number;
  nodeType: string;
  nodeName: string;
  status: NodeStatus;
  treeId: string;
}

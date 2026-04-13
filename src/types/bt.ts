export type BTNodeCategory = 'Control' | 'Decorator' | 'Action' | 'Condition' | 'SubTree';
export type NodeStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE';

export type PortDirection = 'input' | 'output' | 'inout';

export interface BTPort {
  name: string;
  direction: PortDirection;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  portType?: string; // int, string, bool, double, NodeStatus, Any
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
  // Pre/Post conditions (instance-level overrides)
  preconditions?: Record<string, string>;   // _successIf, _failureIf, _skipIf, _while
  postconditions?: Record<string, string>;  // _onSuccess, _onFailure, _onHalted, _post
  // Instance-level description note
  description?: string;
  // SubTree port remapping: "local_port": "external_port"
  portRemap?: Record<string, string>;
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

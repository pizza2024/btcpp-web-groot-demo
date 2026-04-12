import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBTStore } from '../store/btStore';
import type { BTNodeDefinition } from '../types/bt';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';
import type { Node } from '@xyflow/react';

// Pre/post condition attribute keys (matching NodeEditModal)
const PRE_KEYS = ['_failureIf', '_successIf', '_skipIf', '_while'] as const;
const POST_KEYS = ['_onSuccess', '_onFailure', '_onHalted', '_post'] as const;

const PRE_LABELS: Record<string, string> = {
  _failureIf: 'Failure if',
  _successIf: 'Success if',
  _skipIf: 'Skip if',
  _while: 'While (guard)',
};

const POST_LABELS: Record<string, string> = {
  _onSuccess: 'On Success',
  _onFailure: 'On Failure',
  _onHalted: 'On Halted',
  _post: 'Post (any)',
};

const PropertiesPanel: React.FC = () => {
  const { project, activeTreeId, selectedNodeId, updateNodePorts, updateNodeName, updateNodeConditions, localNodes, setLocalCanvas } = useBTStore();

  // Use refs to always get current values in callbacks (avoid stale closure)
  const selectedNodeIdRef = useRef(selectedNodeId);
  const localNodesRef = useRef(localNodes);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);
  useEffect(() => { localNodesRef.current = localNodes; }, [localNodes]);

  // Find the selected BT node in the active tree
  const tree = project.trees.find((t) => t.id === activeTreeId);
  // First try to find in store tree, fall back to local canvas nodes
  let btNode = selectedNodeId && tree ? findNode(tree.root, selectedNodeId) : null;

  // If not found in store tree (e.g., node just created, not yet saved),
  // look up from local canvas nodes
  if (!btNode && selectedNodeId) {
    const localNode = localNodes.find((n) => n.id === selectedNodeId);
    if (localNode) {
      const data = localNode.data as {
        nodeType: string;
        label: string;
        ports?: Record<string, string>;
        category?: string;
        preconditions?: Record<string, string>;
        postconditions?: Record<string, string>;
      };
      btNode = {
        id: localNode.id,
        type: data.nodeType,
        name: data.label !== data.nodeType ? data.label : undefined,
        ports: (data.ports as Record<string, string>) ?? {},
        preconditions: data.preconditions,
        postconditions: data.postconditions,
        children: [],
      };
    }
  }

  const nodeDef: BTNodeDefinition | undefined = btNode
    ? project.nodeModels.find((m) => m.type === btNode.type)
    : undefined;

  const builtinDef = btNode ? BUILTIN_NODES.find((n) => n.type === btNode.type) : undefined;
  const nodeCategory = nodeDef?.category ?? builtinDef?.category ?? 'Control';
  const colors = CATEGORY_COLORS[nodeCategory] ?? CATEGORY_COLORS.Control;

  // Force re-render when node selection changes
  const nodeKey = selectedNodeId ?? 'none';

  // Local state for edited port values
  const [localPorts, setLocalPorts] = useState<Record<string, string>>({});
  useEffect(() => {
    setLocalPorts(btNode?.ports ? { ...btNode.ports } : {});
  }, [nodeKey, btNode?.ports]);

  // Local state for node name
  const [localName, setLocalName] = useState('');
  useEffect(() => {
    setLocalName(btNode?.name ?? '');
  }, [nodeKey, btNode?.name]);

  // Local state for SubTree target
  const [localSubTreeId, setLocalSubTreeId] = useState('');
  useEffect(() => {
    setLocalSubTreeId(btNode?.name ?? '');
  }, [nodeKey, btNode?.name]);

  // Local state for preconditions
  const [localPreconditions, setLocalPreconditions] = useState<Record<string, string>>({});
  useEffect(() => {
    const initPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { initPre[k] = btNode?.preconditions?.[k] ?? ''; });
    setLocalPreconditions(initPre);
  }, [nodeKey, btNode?.preconditions]);

  // Local state for postconditions
  const [localPostconditions, setLocalPostconditions] = useState<Record<string, string>>({});
  useEffect(() => {
    const initPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { initPost[k] = btNode?.postconditions?.[k] ?? ''; });
    setLocalPostconditions(initPost);
  }, [nodeKey, btNode?.postconditions]);

  const allPorts = builtinDef?.ports ?? nodeDef?.ports ?? [];
  const isLeaf = nodeCategory === 'Action' || nodeCategory === 'Condition';
  const isSubTree = btNode?.type === 'SubTree';

  // Save handler for port values
  // For nodes already in the tree, update both tree and localNodes.
  // For nodes only in localNodes (not yet synced), only update localNodes.
  const handleSavePorts = useCallback(() => {
    if (!btNode) return;
    const { localEdges } = useBTStore.getState();
    const currentLocalNodes = localNodesRef.current;
    // Build updated flow nodes with new ports merged
    const mergedPorts = { ...btNode.ports, ...localPorts };
    const updated = currentLocalNodes.map((n: Node) => {
      if (n.id !== btNode.id) return n;
      return { ...n, data: { ...n.data, ports: mergedPorts } };
    });
    // Check if node exists in the tree (not just in localNodes)
    const tree = project.trees.find((t) => t.id === activeTreeId);
    const nodeInTree = tree ? findNode(tree.root, btNode.id) : null;
    if (nodeInTree) {
      // Node is in tree - update tree and localNodes
      updateNodePorts(btNode.id, localPorts);
      setLocalCanvas(updated, localEdges);
    } else {
      // Node only in localNodes (not yet synced to tree) - only update localNodes
      setLocalCanvas(updated, localEdges);
    }
    // Notify ReactFlow canvas to refresh nodes from localNodes
    window.dispatchEvent(new Event('bt-nodes-updated'));
  }, [btNode, localPorts, updateNodePorts, setLocalCanvas, project.trees, activeTreeId]);

  // Save handler for name
  const handleSaveName = useCallback(() => {
    if (!btNode) return;
    const { localEdges } = useBTStore.getState();
    const currentLocalNodes = localNodesRef.current;
    const updated = currentLocalNodes.map((n: Node) => {
      if (n.id !== btNode.id) return n;
      return { ...n, data: { ...n.data, label: localName } };
    });
    // Check if node exists in the tree
    const tree = project.trees.find((t) => t.id === activeTreeId);
    const nodeInTree = tree ? findNode(tree.root, btNode.id) : null;
    if (nodeInTree) {
      updateNodeName(btNode.id, localName);
      setLocalCanvas(updated, localEdges);
    } else {
      setLocalCanvas(updated, localEdges);
    }
    window.dispatchEvent(new Event('bt-nodes-updated'));
  }, [btNode, localName, updateNodeName, setLocalCanvas, project.trees, activeTreeId]);

  // Save handler for SubTree target
  const handleSaveSubTree = useCallback(() => {
    if (!btNode) return;
    const { localEdges } = useBTStore.getState();
    const currentLocalNodes = localNodesRef.current;
    const updated = currentLocalNodes.map((n: Node) => {
      if (n.id !== btNode.id) return n;
      return { ...n, data: { ...n.data, label: localSubTreeId } };
    });
    // Check if node exists in the tree
    const tree = project.trees.find((t) => t.id === activeTreeId);
    const nodeInTree = tree ? findNode(tree.root, btNode.id) : null;
    if (nodeInTree) {
      updateNodeName(btNode.id, localSubTreeId);
      setLocalCanvas(updated, localEdges);
    } else {
      setLocalCanvas(updated, localEdges);
    }
    window.dispatchEvent(new Event('bt-nodes-updated'));
  }, [btNode, localSubTreeId, updateNodeName, setLocalCanvas, project.trees, activeTreeId]);

  // Save handler for pre/post conditions
  const handleSaveConditions = useCallback(() => {
    if (!btNode) return;
    const { localEdges } = useBTStore.getState();
    const currentLocalNodes = localNodesRef.current;

    // Clean up empty conditions
    const cleanPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { if (localPreconditions[k]?.trim()) cleanPre[k] = localPreconditions[k].trim(); });

    const cleanPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { if (localPostconditions[k]?.trim()) cleanPost[k] = localPostconditions[k].trim(); });

    // Build updated flow nodes with new conditions merged into data
    const updated = currentLocalNodes.map((n: Node) => {
      if (n.id !== btNode.id) return n;
      return {
        ...n,
        data: {
          ...n.data,
          preconditions: Object.keys(cleanPre).length > 0 ? cleanPre : undefined,
          postconditions: Object.keys(cleanPost).length > 0 ? cleanPost : undefined,
        },
      };
    });

    // Check if node exists in the tree
    const tree = project.trees.find((t) => t.id === activeTreeId);
    const nodeInTree = tree ? findNode(tree.root, btNode.id) : null;
    if (nodeInTree) {
      // Node is in tree - update tree and localNodes
      updateNodeConditions(
        btNode.id,
        Object.keys(cleanPre).length > 0 ? cleanPre : undefined,
        Object.keys(cleanPost).length > 0 ? cleanPost : undefined
      );
      setLocalCanvas(updated, localEdges);
    } else {
      // Node only in localNodes (not yet synced to tree) - only update localNodes
      setLocalCanvas(updated, localEdges);
    }
    window.dispatchEvent(new Event('bt-nodes-updated'));
  }, [btNode, localPreconditions, localPostconditions, updateNodeConditions, setLocalCanvas, project.trees, activeTreeId]);

  const updatePort = (name: string, value: string) => {
    setLocalPorts((prev) => ({ ...prev, [name]: value }));
  };

  if (!btNode) {
    return (
      <div className="panel properties-panel">
        <div className="panel-header">Properties</div>
        <div style={{ color: '#667', padding: 12, fontSize: 12 }}>
          Select a node on the canvas to view its properties.
        </div>
      </div>
    );
  }

  return (
    <div className="panel properties-panel">
      <div className="panel-header">Properties</div>

      {/* Node identity */}
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: '8px 10px',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 10, color: colors.text, opacity: 0.7, textTransform: 'uppercase' }}>
          {nodeDef?.category ?? builtinDef?.category ?? 'Unknown'}
        </div>
        <div style={{ fontWeight: 700, color: colors.text, fontSize: 14 }}>{btNode.type}</div>
        {(nodeDef?.description ?? builtinDef?.description) && (
          <div style={{ fontSize: 11, color: '#8899bb', marginTop: 4 }}>
            {nodeDef?.description ?? builtinDef?.description}
          </div>
        )}
      </div>

      {/* Node Name (for Control/Decorator/SubTree) */}
      {(builtinDef || isSubTree) && !isLeaf && (
        <Section title="Name">
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="optional alias"
              style={inputStyle}
            />
            {(builtinDef || isSubTree) && (
              <button className="btn-primary" onClick={handleSaveName} style={{ flexShrink: 0 }}>
                Save
              </button>
            )}
          </div>
        </Section>
      )}

      {/* SubTree Target */}
      {isSubTree && (
        <Section title="SubTree Target">
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <select
              value={localSubTreeId}
              onChange={(e) => setLocalSubTreeId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">-- Select Tree --</option>
              {project.trees
                .filter((t) => t.id !== activeTreeId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}
                  </option>
                ))}
            </select>
            <button className="btn-primary" onClick={handleSaveSubTree} style={{ flexShrink: 0 }}>
              Save
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#556' }}>
            Available trees: {project.trees.map((t) => t.id).join(', ')}
          </div>
        </Section>
      )}

      {/* Port Values */}
      {allPorts.length > 0 && (
        <Section title="Port Values">
          {allPorts.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: '#8899bb', minWidth: 80, flexShrink: 0 }}>
                {p.name}
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>({p.direction})</span>
              </label>
              <input
                value={localPorts[p.name] ?? ''}
                onChange={(e) => updatePort(p.name, e.target.value)}
                placeholder="{}"
                style={inputStyle}
                title={p.description}
              />
            </div>
          ))}
          <button className="btn-primary" onClick={handleSavePorts} style={{ marginTop: 4 }}>
            Apply
          </button>
          <div style={{ fontSize: 10, color: '#556', marginTop: 4 }}>
            Use <code style={{ color: '#88aacc' }}>{'{key}'}</code> for blackboard references
          </div>
        </Section>
      )}

      {/* Pre-conditions Section */}
      <Section title="Pre-conditions">
        <div style={{ fontSize: 10, color: '#556', marginBottom: 6 }}>
          Evaluated before tick
        </div>
        {PRE_KEYS.map(key => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: '#8899bb', minWidth: 90, flexShrink: 0 }}>
              {PRE_LABELS[key]}
            </label>
            <input
              type="text"
              value={localPreconditions[key] ?? ''}
              onChange={(e) => setLocalPreconditions(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={key === '_while' ? '{key} == value' : '{expression}'}
              style={inputStyle}
            />
          </div>
        ))}
        <button className="btn-primary" onClick={handleSaveConditions} style={{ marginTop: 4 }}>
          Save
        </button>
      </Section>

      {/* Post-conditions Section */}
      <Section title="Post-conditions">
        <div style={{ fontSize: 10, color: '#556', marginBottom: 6 }}>
          Script executed after tick
        </div>
        {POST_KEYS.map(key => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: '#8899bb', minWidth: 90, flexShrink: 0 }}>
              {POST_LABELS[key]}
            </label>
            <input
              type="text"
              value={localPostconditions[key] ?? ''}
              onChange={(e) => setLocalPostconditions(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder="{expression}"
              style={inputStyle}
            />
          </div>
        ))}
        <button className="btn-primary" onClick={handleSaveConditions} style={{ marginTop: 4 }}>
          Save
        </button>
      </Section>

      {/* Node ID */}
      <div style={{ fontSize: 10, color: '#445', marginTop: 12 }}>ID: {btNode.id}</div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: '#6677aa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {title}
    </div>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #334',
  color: '#ccd',
  borderRadius: 4,
  padding: '3px 6px',
  fontSize: 12,
  width: '100%',
  boxSizing: 'border-box',
};

function findNode(
  node: import('../types/bt').BTTreeNode,
  id: string
): import('../types/bt').BTTreeNode | null {
  if (node.id === id) return node;
  for (const c of node.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

export default PropertiesPanel;

import React, { useState, useEffect, useCallback } from 'react';
import { useBTStore } from '../store/btStore';
import type { BTNodeDefinition } from '../types/bt';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';

const PropertiesPanel: React.FC = () => {
  const { project, activeTreeId, selectedNodeId, updateNodePorts, updateNodeName } = useBTStore();

  // Find the selected BT node in the active tree
  const tree = project.trees.find((t) => t.id === activeTreeId);
  const btNode = selectedNodeId && tree ? findNode(tree.root, selectedNodeId) : null;

  const nodeDef: BTNodeDefinition | undefined = btNode
    ? project.nodeModels.find((m) => m.type === btNode.type)
    : undefined;

  const builtinDef = btNode ? BUILTIN_NODES.find((n) => n.type === btNode.type) : undefined;
  const nodeCategory = nodeDef?.category ?? builtinDef?.category ?? 'Leaf';
  const colors = CATEGORY_COLORS[nodeCategory];

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

  const allPorts = builtinDef?.ports ?? nodeDef?.ports ?? [];
  const isLeaf = nodeCategory === 'Leaf' || (btNode && !builtinDef);
  const isSubTree = btNode?.type === 'SubTree';

  // Save handler for port values
  const handleSavePorts = useCallback(() => {
    if (!btNode) return;
    updateNodePorts(btNode.id, localPorts);
  }, [btNode, localPorts, updateNodePorts]);

  // Save handler for name
  const handleSaveName = useCallback(() => {
    if (!btNode || !builtinDef) return;
    updateNodeName(btNode.id, localName);
  }, [btNode, localName, updateNodeName, builtinDef]);

  // Save handler for SubTree target
  const handleSaveSubTree = useCallback(() => {
    if (!btNode) return;
    updateNodeName(btNode.id, localSubTreeId);
  }, [btNode, localSubTreeId, updateNodeName]);

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

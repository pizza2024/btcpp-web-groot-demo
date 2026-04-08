import React, { useState, useEffect } from 'react';
import { useBTStore } from '../store/btStore';
import type { BTNodeDefinition, BTPort } from '../types/bt';
import { BUILTIN_NODES, CATEGORY_COLORS } from '../types/bt-constants';

const PropertiesPanel: React.FC = () => {
  const { project, activeTreeId, selectedNodeId, updateNodeModel } = useBTStore();

  // Find the selected BT node in the active tree
  const tree = project.trees.find((t) => t.id === activeTreeId);
  const btNode = selectedNodeId && tree ? findNode(tree.root, selectedNodeId) : null;

  const nodeDef: BTNodeDefinition | undefined = btNode
    ? project.nodeModels.find((m) => m.type === btNode.type)
    : undefined;

  const builtinDef = btNode ? BUILTIN_NODES.find((n) => n.type === btNode.type) : undefined;
  const colors = CATEGORY_COLORS[nodeDef?.category ?? builtinDef?.category ?? 'Leaf'];

  const [ports, setPorts] = useState<BTPort[]>(nodeDef?.ports ?? []);
  useEffect(() => { setPorts(nodeDef?.ports ?? []); }, [nodeDef]);

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

  const isBuiltin = !!builtinDef?.builtin;
  const allPorts = builtinDef?.ports ?? nodeDef?.ports ?? [];

  const handleSavePorts = () => {
    if (!nodeDef || isBuiltin) return;
    updateNodeModel({ ...nodeDef, ports });
  };

  const addPort = () => {
    setPorts((prev) => [...prev, { name: '', direction: 'input' }]);
  };

  const updatePort = (idx: number, field: keyof BTPort, value: string) => {
    setPorts((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePort = (idx: number) => {
    setPorts((prev) => prev.filter((_, i) => i !== idx));
  };

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
          {nodeDef?.category ?? 'Unknown'}
        </div>
        <div style={{ fontWeight: 700, color: colors.text, fontSize: 14 }}>{btNode.type}</div>
        {btNode.name && btNode.name !== btNode.type && (
          <div style={{ color: colors.text, opacity: 0.8, fontSize: 12 }}>alias: {btNode.name}</div>
        )}
        {(nodeDef?.description ?? builtinDef?.description) && (
          <div style={{ fontSize: 11, color: '#8899bb', marginTop: 4 }}>
            {nodeDef?.description ?? builtinDef?.description}
          </div>
        )}
      </div>

      {/* Blackboard port values */}
      {allPorts.length > 0 && (
        <Section title="Port Values">
          {allPorts.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: '#8899bb', minWidth: 80, flexShrink: 0 }}>
                {p.name}
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>({p.direction})</span>
              </label>
              <input
                value={btNode.ports?.[p.name] ?? ''}
                readOnly
                placeholder="{key}"
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ fontSize: 10, color: '#556', marginTop: 4 }}>
            To edit port values, update via the canvas node.
          </div>
        </Section>
      )}

      {/* For SubTree: show target tree */}
      {btNode.type === 'SubTree' && (
        <Section title="SubTree Target">
          <div style={{ color: '#ffe080', fontWeight: 500 }}>{btNode.name ?? '(none)'}</div>
          <div style={{ fontSize: 10, color: '#667' }}>
            Available: {project.trees.map((t) => t.id).join(', ')}
          </div>
        </Section>
      )}

      {/* Node definition ports editor (custom nodes only) */}
      {!isBuiltin && nodeDef && (
        <Section title="Port Definitions">
          {ports.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
              <input
                value={p.name}
                onChange={(e) => updatePort(idx, 'name', e.target.value)}
                placeholder="name"
                style={{ ...inputStyle, flex: 2 }}
              />
              <select
                value={p.direction}
                onChange={(e) => updatePort(idx, 'direction', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              >
                <option value="input">in</option>
                <option value="output">out</option>
                <option value="inout">inout</option>
              </select>
              <button
                onClick={() => removePort(idx)}
                style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}
              >✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button className="btn-secondary" onClick={addPort} style={{ flex: 1 }}>+ Port</button>
            <button className="btn-primary" onClick={handleSavePorts} style={{ flex: 1 }}>Save</button>
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

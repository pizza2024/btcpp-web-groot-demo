import React, { useState, useEffect, useMemo } from 'react';
import { BUILTIN_NODES } from '../types/bt-constants';
import type { BTNodeDefinition } from '../types/bt';

interface NodeEditModalProps {
  nodeId: string;
  nodeType: string;
  nodeCategory: string;
  nodeName?: string;
  ports: Record<string, string>;
  availableTrees?: string[];
  onSave: (data: { name?: string; ports: Record<string, string> }) => void;
  onClose: () => void;
}

function getNodeDef(nodeType: string): BTNodeDefinition | undefined {
  return BUILTIN_NODES.find(n => n.type === nodeType);
}

function isNumericPort(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('count') || n.includes('num') || n.includes('msec') ||
    n.includes('delay') || n.includes('timeout') || n.includes('attempt') || n.includes('cycle');
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({
  nodeId, nodeType, nodeCategory, nodeName, ports, availableTrees = [], onSave, onClose
}) => {
  const nodeDef = useMemo(() => getNodeDef(nodeType), [nodeType]);

  // For SubTree, name field is the target tree ID
  const isSubTree = nodeType === 'SubTree';
  const isLeaf = nodeCategory === 'Action' || nodeCategory === 'Condition';
  const isControl = nodeCategory === 'Control';

  // Local state
  const [instanceName, setInstanceName] = useState(nodeName ?? '');
  const [subTreeTarget, setSubTreeTarget] = useState(isSubTree ? (nodeName ?? '') : '');
  const [autoRemap, setAutoRemap] = useState(ports['__autoremap'] === 'true' || ports['__autoremap'] === '1');
  const [portValues, setPortValues] = useState<Record<string, string>>({ ...ports });

  // Initialize — filter out __autoremap from port values display
  useEffect(() => {
    const filtered = { ...ports };
    delete filtered['__autoremap'];
    setPortValues(filtered);
    setInstanceName(nodeName ?? '');
    setSubTreeTarget(isSubTree ? (nodeName ?? '') : '');
    setAutoRemap(ports['__autoremap'] === 'true' || ports['__autoremap'] === '1');
  }, [nodeId]);

  const defPorts = (nodeDef?.ports ?? []).filter((p: any) => p.name !== '__autoremap');

  const handleSave = () => {
    const finalPorts = { ...portValues };
    if (isSubTree) {
      finalPorts['__autoremap'] = autoRemap ? 'true' : 'false';
    }
    const name = isSubTree ? subTreeTarget : (isControl ? instanceName : undefined);
    onSave({ name: name || undefined, ports: finalPorts });
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handlePortChange = (name: string, value: string) => {
    setPortValues(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content node-edit-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-node-type">{nodeType}</span>
            <span className="modal-node-id">#{nodeId.slice(0, 8)}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Node description (read-only) */}
          {nodeDef?.description && (
            <div className="form-group">
              <label>Description</label>
              <div className="info-text">{nodeDef.description}</div>
            </div>
          )}

          {/* Name (Control nodes only — alias) */}
          {isControl && !isSubTree && (
            <div className="form-group">
              <label>Name (alias)</label>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="optional display name"
              />
              <span className="form-hint">Display name shown on the node</span>
            </div>
          )}

          {/* SubTree Target */}
          {isSubTree && (
            <>
              <div className="form-group">
                <label>SubTree Target</label>
                <select
                  value={subTreeTarget}
                  onChange={(e) => setSubTreeTarget(e.target.value)}
                >
                  <option value="">-- Select Tree --</option>
                  {availableTrees.map(treeId => (
                    <option key={treeId} value={treeId}>{treeId}</option>
                  ))}
                </select>
                <span className="form-hint">Select the behavior tree to reference</span>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={autoRemap}
                    onChange={(e) => setAutoRemap(e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Auto-remap ports by name
                </label>
                <span className="form-hint">
                  Automatically map child tree input/output ports to matching parent ports
                </span>
              </div>
            </>
          )}

          {/* Port Values */}
          {defPorts.length > 0 && (
            <div className="form-group">
              <label>Port Values</label>
              <div className="port-list-edit">
                {defPorts.map((port: any) => (
                  <div key={port.name} className="port-row-edit">
                    <div className="port-label">
                      <span className="port-name">[{port.direction}] {port.name}</span>
                      {port.description && (
                        <span className="port-desc"> — {port.description}</span>
                      )}
                      {port.defaultValue && (
                        <span className="form-hint"> default: {port.defaultValue}</span>
                      )}
                    </div>
                    {isNumericPort(port.name) ? (
                      <input
                        type="number"
                        value={portValues[port.name] ?? ''}
                        onChange={(e) => handlePortChange(port.name, e.target.value)}
                        placeholder={port.defaultValue ?? '0'}
                        min={0}
                      />
                    ) : (
                      <input
                        type="text"
                        value={portValues[port.name] ?? ''}
                        onChange={(e) => handlePortChange(port.name, e.target.value)}
                        placeholder={port.defaultValue ?? '{}'}
                      />
                    )}
                  </div>
                ))}
              </div>
              <span className="form-hint">
                Use <code>{'{key}'}</code> for blackboard references
              </span>
            </div>
          )}

          {/* Leaf nodes without ports */}
          {isLeaf && defPorts.length === 0 && (
            <div className="form-group">
              <label>Note</label>
              <div className="info-text">
                This {nodeType} node has no configurable ports.
              </div>
            </div>
          )}

          {/* Control nodes without ports */}
          {isControl && defPorts.length === 0 && !isSubTree && (
            <div className="form-group">
              <label>Note</label>
              <div className="info-text">
                This {nodeType} node has no configurable ports.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Apply</button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal;

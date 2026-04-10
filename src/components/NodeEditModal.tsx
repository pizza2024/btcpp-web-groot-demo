import React, { useState, useEffect } from 'react';
import { BUILTIN_NODES } from '../types/bt-constants';

interface NodeEditModalProps {
  nodeId: string;
  nodeType: string;
  nodeCategory: string;
  nodeName?: string;
  ports: Record<string, string>;
  availableTrees?: string[]; // For SubTree nodes
  onSave: (data: { name?: string; ports: Record<string, string> }) => void;
  onClose: () => void;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({
  nodeId,
  nodeType,
  nodeCategory,
  nodeName,
  ports,
  availableTrees = [],
  onSave,
  onClose,
}) => {
  const builtinDef = BUILTIN_NODES.find((n) => n.type === nodeType);
  const isLeaf = nodeCategory === 'Leaf' || (!builtinDef && nodeCategory !== 'Control');
  const isSubTree = nodeType === 'SubTree';
  const isControl = nodeCategory === 'Control';

  // Port definitions from builtin or custom node
  const portDefs = builtinDef?.ports ?? [];

  // Local state
  const [localName, setLocalName] = useState(nodeName ?? '');
  const [localPorts, setLocalPorts] = useState<Record<string, string>>({ ...ports });

  useEffect(() => {
    setLocalName(nodeName ?? '');
    setLocalPorts({ ...ports });
  }, [nodeId, nodeName, ports]);

  // Handle port value change
  const updatePort = (name: string, value: string) => {
    setLocalPorts((prev) => ({ ...prev, [name]: value }));
  };

  // Handle save
  const handleSave = () => {
    onSave({
      name: localName || undefined,
      ports: localPorts,
    });
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Determine if a port is numeric
  const isNumericPort = (portName: string): boolean => {
    return (
      portName.toLowerCase().includes('count') ||
      portName.toLowerCase().includes('num') ||
      portName.toLowerCase().includes('attempts') ||
      portName.toLowerCase().includes('cycles') ||
      portName.toLowerCase().includes('msec') ||
      portName.toLowerCase().includes('delay') ||
      portName.toLowerCase().includes('timeout')
    );
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-node-type">{nodeType}</span>
            <span className="modal-node-id">#{nodeId.slice(0, 8)}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Node Name (for Control/Decorator/SubTree) */}
          {!isLeaf && (
            <div className="form-group">
              <label>Name (alias)</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="optional alias"
              />
              <span className="form-hint">Display name shown on the node</span>
            </div>
          )}

          {/* SubTree Target */}
          {isSubTree && (
            <div className="form-group">
              <label>SubTree Target</label>
              <select
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
              >
                <option value="">-- Select Tree --</option>
                {availableTrees.map((treeId) => (
                  <option key={treeId} value={treeId}>
                    {treeId}
                  </option>
                ))}
              </select>
              <span className="form-hint">Select the tree to reference</span>
            </div>
          )}

          {/* Port Values */}
          {portDefs.length > 0 && (
            <div className="form-group">
              <label>Port Values</label>
              {portDefs.map((port) => (
                <div key={port.name} className="port-row">
                  <div className="port-label">
                    <span className="port-name">{port.name}</span>
                    <span className="port-direction">({port.direction})</span>
                  </div>
                  {isNumericPort(port.name) ? (
                    <input
                      type="number"
                      value={localPorts[port.name] ?? ''}
                      onChange={(e) => updatePort(port.name, e.target.value)}
                      placeholder="0"
                      min={0}
                    />
                  ) : (
                    <input
                      type="text"
                      value={localPorts[port.name] ?? ''}
                      onChange={(e) => updatePort(port.name, e.target.value)}
                      placeholder="{}"
                      title={port.description}
                    />
                  )}
                  {port.description && (
                    <span className="form-hint port-desc">{port.description}</span>
                  )}
                </div>
              ))}
              <span className="form-hint">
                Use <code>{'{key}'}</code> for blackboard references
              </span>
            </div>
          )}

          {/* Leaf nodes without port definitions */}
          {isLeaf && portDefs.length === 0 && (
            <div className="form-group">
              <label>Note</label>
              <div className="info-text">
                This {nodeType} node has no configurable ports.
                {builtinDef?.description && (
                  <span> {builtinDef.description}</span>
                )}
              </div>
            </div>
          )}

          {/* Info for Control nodes */}
          {isControl && (
            <div className="form-group">
              <label>Info</label>
              <div className="info-text">
                Control nodes execute their children in sequence or parallel.
                {builtinDef?.description && (
                  <span> {builtinDef.description}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal;

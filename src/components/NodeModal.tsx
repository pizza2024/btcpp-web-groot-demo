import React, { useState, useEffect } from 'react';
import { CATEGORY_COLORS, PORT_DIRECTIONS } from '../types/bt-constants';
import type { BTNodeCategory, BTNodeDefinition, BTPort, PortDirection } from '../types/bt';

// ─── Types ────────────────────────────────────────────────────────────────

interface PortFormState {
  name: string;
  direction: PortDirection;
  description: string;
  defaultValue: string;
}

const emptyPort: PortFormState = {
  name: '',
  direction: 'input',
  description: '',
  defaultValue: '',
};

export type NodeModalMode = 'create' | 'edit-instance' | 'edit-definition';

/** 创建新节点时传入 */
export interface NodeModalCreateData {
  mode: 'create';
  defaultCategory?: BTNodeCategory;
}

/** 编辑已有节点实例时传入 (canvas 上的节点) */
export interface NodeModalEditInstanceData {
  mode: 'edit-instance';
  nodeId: string;
  nodeType: string;
  nodeCategory: string;
  nodeName?: string;      // instance alias (not node type)
  ports: Record<string, string>;  // current port values
  availableTrees?: string[];
}

/** 编辑节点定义时传入 (Palette 中的自定义节点) */
export interface NodeModalEditDefinitionData {
  mode: 'edit-definition';
  nodeDef: BTNodeDefinition;
}

export type NodeModalData = NodeModalCreateData | NodeModalEditInstanceData | NodeModalEditDefinitionData;

interface NodeModalProps {
  data: NodeModalData;
  onSave: (result: NodeModalSaveResult) => void;
  onClose: () => void;
}

export interface NodeModalSaveResult {
  // For create-definition
  newDef?: BTNodeDefinition;
  // For edit-instance
  nodeId?: string;
  name?: string;
  ports?: Record<string, string>;
  // For edit-definition
  updatedDef?: BTNodeDefinition;
}

// ─── Component ─────────────────────────────────────────────────────────────

const NodeModal: React.FC<NodeModalProps> = ({ data, onSave, onClose }) => {
  const isCreate = data.mode === 'create';
  const isEditInstance = data.mode === 'edit-instance';
  const isEditDefinition = data.mode === 'edit-definition';

  // Form state
  const [nodeType, setNodeType] = useState('');
  const [category, setCategory] = useState<BTNodeCategory>('Action');
  const [description, setDescription] = useState('');
  const [ports, setPorts] = useState<PortFormState[]>([]);

  // Name (for edit-instance)
  const [instanceName, setInstanceName] = useState('');

  // SubTree target (for edit-instance with SubTree)
  const [subTreeTarget, setSubTreeTarget] = useState('');

  // Initialize form based on mode
  useEffect(() => {
    if (isCreate) {
      setNodeType('');
      setCategory(data.defaultCategory ?? 'Action');
      setDescription('');
      setPorts([]);
      setInstanceName('');
      setSubTreeTarget('');
    } else if (isEditInstance) {
      setNodeType(data.nodeType);
      setCategory(data.nodeCategory as BTNodeCategory);
      setInstanceName(data.nodeName ?? '');
      setSubTreeTarget(data.nodeName ?? '');
      // Convert port values to form state (empty for missing)
      const portEntries = Object.entries(data.ports);
      setPorts(portEntries.length > 0
        ? portEntries.map(([name, value]) => ({ name, direction: 'input' as PortDirection, description: '', defaultValue: value }))
        : []
      );
    } else if (isEditDefinition) {
      const def = data.nodeDef;
      setNodeType(def.type);
      setCategory(def.category);
      setDescription(def.description ?? '');
      setPorts(def.ports?.map(p => ({
        name: p.name,
        direction: p.direction,
        description: p.description ?? '',
        defaultValue: p.defaultValue ?? '',
      })) ?? []);
      setInstanceName('');
      setSubTreeTarget('');
    }
  }, [data]);

  // Port management
  const handleAddPort = () => setPorts(prev => [...prev, { ...emptyPort }]);

  const handleRemovePort = (index: number) => {
    setPorts(prev => prev.filter((_, i) => i !== index));
  };

  const handlePortChange = (index: number, field: keyof PortFormState, value: string) => {
    setPorts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSave = () => {
    if (isCreate) {
      if (!nodeType.trim()) {
        alert('Please enter a node type name');
        return;
      }
      const validPorts: BTPort[] = ports
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name.trim(),
          direction: p.direction,
          description: p.description.trim() || undefined,
          defaultValue: p.defaultValue.trim() || undefined,
        }));

      onSave({
        newDef: {
          type: nodeType.trim(),
          category,
          description: description.trim() || undefined,
          ports: validPorts.length > 0 ? validPorts : undefined,
        },
      });
    } else if (isEditInstance) {
      // For SubTree, name is the target tree ID
      const name = data.nodeType === 'SubTree' ? subTreeTarget : instanceName;
      const portValues: Record<string, string> = {};
      ports.forEach(p => {
        if (p.name.trim()) portValues[p.name.trim()] = p.defaultValue;
      });

      onSave({
        nodeId: data.nodeId,
        name: name || undefined,
        ports: portValues,
      });
    } else if (isEditDefinition) {
      const validPorts: BTPort[] = ports
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name.trim(),
          direction: p.direction,
          description: p.description.trim() || undefined,
          defaultValue: p.defaultValue.trim() || undefined,
        }));

      onSave({
        updatedDef: {
          ...data.nodeDef,
          category,
          description: description.trim() || undefined,
          ports: validPorts.length > 0 ? validPorts : undefined,
        },
      });
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const colors = CATEGORY_COLORS[isEditDefinition ? category : (data.mode === 'edit-instance' ? (data.nodeCategory as BTNodeCategory) : category)];
  const isSubTree = nodeType === 'SubTree';

  const getTitle = () => {
    if (isCreate) return 'Create Custom Node';
    if (isEditInstance) return `Edit ${nodeType}`;
    return `Edit Definition: ${nodeType}`;
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content node-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span style={{ color: '#c8e0ff' }}>{getTitle()}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Node Type + Category Row (not editable in edit modes) */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Node Type {isCreate ? '*' : ''}</label>
              <input
                type="text"
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value)}
                placeholder="e.g. MoveToGoal"
                disabled={!isCreate}
                className={!isCreate ? 'input-disabled' : ''}
                autoFocus={isCreate}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BTNodeCategory)}
                disabled={!isCreate}
                className={!isCreate ? 'input-disabled' : ''}
              >
                <option value="Action">Action</option>
                <option value="Condition">Condition</option>
                <option value="Control">Control</option>
                <option value="Decorator">Decorator</option>
                <option value="SubTree">SubTree</option>
              </select>
            </div>
          </div>

          {/* Instance Name (edit-instance only, non-SubTree) */}
          {isEditInstance && !isSubTree && (
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

          {/* SubTree Target (edit-instance + SubTree) */}
          {isEditInstance && isSubTree && (
            <div className="form-group">
              <label>SubTree Target</label>
              <select
                value={subTreeTarget}
                onChange={(e) => setSubTreeTarget(e.target.value)}
              >
                <option value="">-- Select Tree --</option>
                {(data as NodeModalEditInstanceData).availableTrees
                  ?.filter(t => t !== (data as NodeModalEditInstanceData).nodeId.replace(/^n_/, ''))
                  .map(treeId => (
                    <option key={treeId} value={treeId}>{treeId}</option>
                  ))}
              </select>
              <span className="form-hint">Select the tree to reference</span>
            </div>
          )}

          {/* Description (create/edit-definition only) */}
          {(isCreate || isEditDefinition) && (
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          )}

          {/* Ports Section */}
          <div className="form-group">
            <div className="ports-header">
              <label>
                {isEditInstance ? 'Port Values' : 'Ports'}
                {ports.length > 0 && <span className="ports-count">({ports.length})</span>}
              </label>
              {isCreate && (
                <button type="button" className="btn-add-port" onClick={handleAddPort}>
                  + Add Port
                </button>
              )}
            </div>

            {ports.length > 0 && (
              <div className="ports-list">
                {ports.map((port, index) => (
                  <div key={index} className="port-item">
                    <div className="port-item-header">
                      <span className="port-index">#{index + 1}</span>
                      {isCreate && (
                        <button
                          type="button"
                          className="btn-remove-port"
                          onClick={() => handleRemovePort(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="port-item-body">
                      <div className="port-field port-field-name">
                        <label>Name</label>
                        <input
                          type="text"
                          value={port.name}
                          onChange={(e) => handlePortChange(index, 'name', e.target.value)}
                          placeholder="e.g. msec"
                          disabled={!isCreate}
                          className={!isCreate ? 'input-disabled' : ''}
                        />
                      </div>
                      <div className="port-field port-field-dir">
                        <label>Direction</label>
                        <select
                          value={port.direction}
                          onChange={(e) => handlePortChange(index, 'direction', e.target.value)}
                          disabled={!isCreate}
                          className={!isCreate ? 'input-disabled' : ''}
                        >
                          {PORT_DIRECTIONS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="port-field port-field-default">
                        <label>{isEditInstance ? 'Value' : 'Default'}</label>
                        <input
                          type="text"
                          value={port.defaultValue}
                          onChange={(e) => handlePortChange(index, 'defaultValue', e.target.value)}
                          placeholder={isEditInstance ? 'current value' : '-1, true, ...'}
                        />
                      </div>
                    </div>
                    {isCreate && (
                      <div className="port-field port-field-desc">
                        <label>Description</label>
                        <input
                          type="text"
                          value={port.description}
                          onChange={(e) => handlePortChange(index, 'description', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ports.length === 0 && (
              <div className="ports-empty">
                {isEditInstance
                  ? 'No ports to configure'
                  : 'No ports defined. Ports are optional — click "Add Port" to define input/output parameters.'}
              </div>
            )}
          </div>

          {/* Preview (create mode only) */}
          {isCreate && nodeType && (
            <div className="node-preview">
              <div className="preview-label">Preview</div>
              <div
                className="preview-node"
                style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <div className="preview-category">{category}</div>
                <div className="preview-type">{nodeType}</div>
                {description && <div className="preview-desc">{description}</div>}
                {ports.filter(p => p.name).length > 0 && (
                  <div className="preview-ports">
                    {ports.filter(p => p.name).map((p, i) => (
                      <div key={i} className="preview-port">
                        <span className="preview-port-dir">{p.direction}</span>
                        <span className="preview-port-name">{p.name}</span>
                        {p.defaultValue && <span className="preview-port-default">= {p.defaultValue}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            {isCreate ? 'Create' : isEditInstance ? 'Apply' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeModal;

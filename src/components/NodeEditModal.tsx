import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { validateConditionExpression } from '../utils/scriptExpressionParser';

interface NodeEditModalProps {
  nodeId: string;
  nodeType: string;
  nodeCategory: string;
  nodeName?: string;
  ports: Record<string, string>;
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  description?: string;
  portRemap?: Record<string, string>;
  availableTrees?: string[];
  onSave: (data: {
    name?: string;
    ports: Record<string, string>;
    preconditions?: Record<string, string>;
    postconditions?: Record<string, string>;
    description?: string;
    portRemap?: Record<string, string>;
  }) => void;
  onClose: () => void;
}

// Pre/post condition attribute keys
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

const clearIconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  minWidth: 22,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const NodeEditModal: React.FC<NodeEditModalProps> = ({
  nodeId, nodeType, nodeCategory, nodeName, ports, preconditions = {}, postconditions = {},
  description: initialDescription = '', portRemap = {},
  availableTrees = [], onSave, onClose
}) => {
  const isSubTree = nodeType === 'SubTree';
  const isLeaf = nodeCategory === 'Action' || nodeCategory === 'Condition';
  const autoRemapEnabled = ports['__autoremap'] === 'true' || ports['__autoremap'] === '1';

  // ─── Instance state ───────────────────────────────────────────────────
  const [instanceName, setInstanceName] = useState(nodeName ?? '');
  const [subTreeTarget, setSubTreeTarget] = useState(isSubTree ? (nodeName ?? '') : '');
  const [autoRemap, setAutoRemap] = useState(autoRemapEnabled);
  const [portRemapEntries, setPortRemapEntries] = useState<Array<{ local: string; external: string }>>(
    Object.entries(portRemap).map(([k, v]) => ({ local: k, external: v }))
  );

  // ─── Pre/Post conditions state ─────────────────────────────────────────
  const [preCond, setPreCond] = useState<Record<string, string>>({});
  const [postCond, setPostCond] = useState<Record<string, string>>({});
  const [preCondErrors, setPreCondErrors] = useState<Record<string, string>>({});
  const [postCondErrors, setPostCondErrors] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');

  // ─── Initialize ────────────────────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setInstanceName(nodeName ?? '');
    setSubTreeTarget(isSubTree ? (nodeName ?? '') : '');
    setAutoRemap(autoRemapEnabled);

    // Preconditions
    const initPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { initPre[k] = preconditions[k] ?? ''; });
    setPreCond(initPre);

    // Postconditions
    const initPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { initPost[k] = postconditions[k] ?? ''; });
    setPostCond(initPost);

    // Description
    setDescription(initialDescription ?? '');

    // Port remap entries
    setPortRemapEntries(
      Object.entries(portRemap).map(([k, v]) => ({ local: k, external: v }))
    );
  }, [nodeId, nodeName, isSubTree, autoRemapEnabled, initialDescription, preconditions, postconditions, portRemap]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handlePreChange = (key: string, value: string) => {
    setPreCond(prev => ({ ...prev, [key]: value }));
    if (value.trim()) {
      const result = validateConditionExpression(value);
      setPreCondErrors(prev => ({ ...prev, [key]: result.valid ? '' : (result.error || 'Invalid expression') }));
    } else {
      setPreCondErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handlePostChange = (key: string, value: string) => {
    setPostCond(prev => ({ ...prev, [key]: value }));
    if (value.trim()) {
      const result = validateConditionExpression(value);
      setPostCondErrors(prev => ({ ...prev, [key]: result.valid ? '' : (result.error || 'Invalid expression') }));
    } else {
      setPostCondErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const clearAllPreConditions = () => {
    const cleared: Record<string, string> = {};
    PRE_KEYS.forEach((key) => {
      cleared[key] = '';
    });
    setPreCond(cleared);
    setPreCondErrors({});
  };

  const clearAllPostConditions = () => {
    const cleared: Record<string, string> = {};
    POST_KEYS.forEach((key) => {
      cleared[key] = '';
    });
    setPostCond(cleared);
    setPostCondErrors({});
  };

  // ─── Port remap handlers ───────────────────────────────────────────────
  const addPortRemap = () => {
    setPortRemapEntries(prev => [...prev, { local: '', external: '' }]);
  };

  const updatePortRemap = (index: number, field: 'local' | 'external', value: string) => {
    setPortRemapEntries(prev => prev.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const removePortRemap = (index: number) => {
    setPortRemapEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // F1.1: Re-validate all pre/post conditions before saving — block if invalid
    const newPreErrors: Record<string, string> = {};
    const newPostErrors: Record<string, string> = {};
    let hasErrors = false;
    PRE_KEYS.forEach(k => {
      if (preCond[k].trim()) {
        const result = validateConditionExpression(preCond[k]);
        if (!result.valid) {
          newPreErrors[k] = result.error || 'Invalid expression';
          hasErrors = true;
        }
      }
    });
    POST_KEYS.forEach(k => {
      if (postCond[k].trim()) {
        const result = validateConditionExpression(postCond[k]);
        if (!result.valid) {
          newPostErrors[k] = result.error || 'Invalid expression';
          hasErrors = true;
        }
      }
    });
    if (hasErrors) {
      setPreCondErrors(newPreErrors);
      setPostCondErrors(newPostErrors);
      return; // Block save until errors are fixed
    }

    // Clean up empty pre/post conditions
    const cleanPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { if (preCond[k].trim()) cleanPre[k] = preCond[k].trim(); });

    const cleanPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { if (postCond[k].trim()) cleanPost[k] = postCond[k].trim(); });

    // Compute name: SubTree uses subTreeTarget, others use instanceName if different from nodeType
    let name: string | undefined;
    if (isSubTree) {
      name = subTreeTarget || undefined;
    } else if (instanceName && instanceName !== nodeType) {
      name = instanceName;
    }

    // Build portRemap object from entries
    const cleanPortRemap: Record<string, string> = {};
    portRemapEntries.forEach(({ local, external }) => {
      if (local.trim() && external.trim()) {
        cleanPortRemap[local.trim()] = external.trim();
      }
    });

    onSave({
      name,
      ports, // Pass ports through unchanged
      // Pass empty objects explicitly so callers can persist condition clearing.
      preconditions: cleanPre,
      postconditions: cleanPost,
      description: description.trim() || undefined,
      portRemap: Object.keys(cleanPortRemap).length > 0 ? cleanPortRemap : undefined,
    });
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content node-edit-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-node-type">{nodeType}</span>
            <span className="modal-instance-id">Instance #{nodeId.slice(0, 8)}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* ─── Instance Section (always shown) ─────────────────────────────── */}
          <div className="edit-section">
            <div className="edit-section-title">Instance</div>
            <div className="form-row">
              <div className="form-group">
                <label>NodeType</label>
                <input
                  type="text"
                  value={nodeCategory}
                  disabled
                  className="input-disabled"
                />
              </div>
              <div className="form-group">
                <label>ModelName</label>
                {isSubTree ? (
                  <select
                    value={subTreeTarget}
                    onChange={(e) => setSubTreeTarget(e.target.value)}
                  >
                    <option value="">-- Select Tree --</option>
                    {availableTrees.map(treeId => (
                      <option key={treeId} value={treeId}>{treeId}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={nodeType}
                    disabled
                    className="input-disabled"
                  />
                )}
              </div>
              <div className="form-group">
                <label>InstanceName</label>
                <input
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder={isLeaf ? nodeType : 'optional'}
                />
              </div>
            </div>
            {isSubTree && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={autoRemap}
                    onChange={(e) => setAutoRemap(e.target.checked)}
                  />
                  Auto-remap ports by name
                </label>
                <span className="form-hint">
                  Automatically map child tree input/output ports to matching parent ports
                </span>
              </div>
            )}
          </div>

          {/* ─── Port Remap Section (SubTree only) ────────────────────────────── */}
          {isSubTree && !autoRemap && (
            <div className="edit-section">
              <div className="edit-section-title">
                Port Mapping
                <button type="button" className="btn-small" onClick={addPortRemap} style={{ marginLeft: 8 }}>
                  + Add Mapping
                </button>
              </div>
              <span className="form-hint" style={{ marginBottom: 8, display: 'block' }}>
                Map local port names to external (child tree) port names: local_port := external_port
              </span>
              {portRemapEntries.length === 0 && (
                <div className="form-hint" style={{ color: '#8899bb' }}>No port mappings configured</div>
              )}
              {portRemapEntries.map((entry, index) => (
                <div key={index} className="form-row" style={{ alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    value={entry.local}
                    onChange={(e) => updatePortRemap(index, 'local', e.target.value)}
                    placeholder="local_port"
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#4a80d0' }}>:=</span>
                  <input
                    type="text"
                    value={entry.external}
                    onChange={(e) => updatePortRemap(index, 'external', e.target.value)}
                    placeholder="external_port"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-small btn-danger btn-icon"
                    onClick={() => removePortRemap(index)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ─── Description Section ─────────────────────────────────────── */}
          <div className="edit-section">
            <div className="edit-section-title">Description</div>
            <div className="form-group">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional description"
              />
            </div>
          </div>

          {/* ─── Pre-conditions Section ───────────────────────────────────── */}
          <div className="edit-section">
            <div
              className="edit-section-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
            >
              <span>
                Pre-conditions
                <span className="section-hint">(evaluated before tick)</span>
              </span>
              <button
                type="button"
                className="btn-small"
                data-testid="clear-pre-all"
                onClick={clearAllPreConditions}
              >
                Clear all
              </button>
            </div>
            {PRE_KEYS.map(key => (
              <div key={key} className="form-group">
                <label>{PRE_LABELS[key]}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={preCond[key] ?? ''}
                    onChange={(e) => handlePreChange(key, e.target.value)}
                    placeholder={key === '_while' ? '{key} == value' : '{expression}'}
                    className={preCondErrors[key] ? 'input-error' : ''}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-small btn-icon"
                    data-testid={`clear-pre-${key}`}
                    title="Clear field"
                    aria-label={`Clear ${PRE_LABELS[key]}`}
                    onClick={() => handlePreChange(key, '')}
                    disabled={!preCond[key]?.length}
                    style={clearIconButtonStyle}
                  >
                    <X size={12} />
                  </button>
                </div>
                {preCondErrors[key] && (
                  <div className="field-error">{preCondErrors[key]}</div>
                )}
              </div>
            ))}
          </div>

          {/* ─── Post-conditions Section ──────────────────────────────────── */}
          <div className="edit-section">
            <div
              className="edit-section-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
            >
              <span>
                Post-conditions
                <span className="section-hint">(script executed after tick)</span>
              </span>
              <button
                type="button"
                className="btn-small"
                data-testid="clear-post-all"
                onClick={clearAllPostConditions}
              >
                Clear all
              </button>
            </div>
            {POST_KEYS.map(key => (
              <div key={key} className="form-group">
                <label>{POST_LABELS[key]}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={postCond[key] ?? ''}
                    onChange={(e) => handlePostChange(key, e.target.value)}
                    placeholder="{expression}"
                    className={postCondErrors[key] ? 'input-error' : ''}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-small btn-icon"
                    data-testid={`clear-post-${key}`}
                    title="Clear field"
                    aria-label={`Clear ${POST_LABELS[key]}`}
                    onClick={() => handlePostChange(key, '')}
                    disabled={!postCond[key]?.length}
                    style={clearIconButtonStyle}
                  >
                    <X size={12} />
                  </button>
                </div>
                {postCondErrors[key] && (
                  <div className="field-error">{postCondErrors[key]}</div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal;

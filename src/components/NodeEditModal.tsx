import React, { useState, useEffect } from 'react';

interface NodeEditModalProps {
  nodeId: string;
  nodeType: string;
  nodeCategory: string;
  nodeName?: string;
  ports: Record<string, string>;
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  description?: string;
  availableTrees?: string[];
  onSave: (data: {
    name?: string;
    ports: Record<string, string>;
    preconditions?: Record<string, string>;
    postconditions?: Record<string, string>;
    description?: string;
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

const NodeEditModal: React.FC<NodeEditModalProps> = ({
  nodeId, nodeType, nodeCategory, nodeName, ports, preconditions = {}, postconditions = {},
  description: initialDescription = '',
  availableTrees = [], onSave, onClose
}) => {
  const isSubTree = nodeType === 'SubTree';
  const isLeaf = nodeCategory === 'Action' || nodeCategory === 'Condition';

  // ─── Instance state ───────────────────────────────────────────────────
  const [instanceName, setInstanceName] = useState(nodeName ?? '');
  const [subTreeTarget, setSubTreeTarget] = useState(isSubTree ? (nodeName ?? '') : '');
  const [autoRemap, setAutoRemap] = useState(ports['__autoremap'] === 'true' || ports['__autoremap'] === '1');

  // ─── Pre/Post conditions state ─────────────────────────────────────────
  const [preCond, setPreCond] = useState<Record<string, string>>({});
  const [postCond, setPostCond] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');

  // ─── Initialize ────────────────────────────────────────────────────────
  useEffect(() => {
    setInstanceName(nodeName ?? '');
    setSubTreeTarget(isSubTree ? (nodeName ?? '') : '');
    setAutoRemap(ports['__autoremap'] === 'true' || ports['__autoremap'] === '1');

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
  }, [nodeId]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handlePreChange = (key: string, value: string) => {
    setPreCond(prev => ({ ...prev, [key]: value }));
  };

  const handlePostChange = (key: string, value: string) => {
    setPostCond(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
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

    onSave({
      name,
      ports, // Pass ports through unchanged
      preconditions: Object.keys(cleanPre).length > 0 ? cleanPre : undefined,
      postconditions: Object.keys(cleanPost).length > 0 ? cleanPost : undefined,
      description: description.trim() || undefined,
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
            <div className="edit-section-title">
              Pre-conditions
              <span className="section-hint">(evaluated before tick)</span>
            </div>
            {PRE_KEYS.map(key => (
              <div key={key} className="form-group">
                <label>{PRE_LABELS[key]}</label>
                <input
                  type="text"
                  value={preCond[key] ?? ''}
                  onChange={(e) => handlePreChange(key, e.target.value)}
                  placeholder={key === '_while' ? '{key} == value' : '{expression}'}
                />
              </div>
            ))}
          </div>

          {/* ─── Post-conditions Section ──────────────────────────────────── */}
          <div className="edit-section">
            <div className="edit-section-title">
              Post-conditions
              <span className="section-hint">(script executed after tick)</span>
            </div>
            {POST_KEYS.map(key => (
              <div key={key} className="form-group">
                <label>{POST_LABELS[key]}</label>
                <input
                  type="text"
                  value={postCond[key] ?? ''}
                  onChange={(e) => handlePostChange(key, e.target.value)}
                  placeholder="{expression}"
                />
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditModal;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CdataEditModalProps {
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  initialCdata?: string;
  onSave: (cdata: string | undefined) => void;
  onClose: () => void;
}

const CdataEditModal: React.FC<CdataEditModalProps> = ({
  nodeId,
  nodeType,
  nodeName,
  initialCdata = '',
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [cdata, setCdata] = useState(initialCdata);

  useEffect(() => {
    setCdata(initialCdata);
  }, [initialCdata]);

  const handleSave = () => {
    const trimmed = cdata.trim();
    onSave(trimmed ? trimmed : undefined);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const displayName = nodeName && nodeName !== nodeType ? `${nodeType} (${nodeName})` : nodeType;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content node-edit-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span style={{ color: '#ffe080' }}>📦</span>
            <span className="modal-node-type">CDATA Block</span>
            <span className="modal-instance-id" style={{ opacity: 0.6 }}>
              {displayName} · #{nodeId.slice(0, 8)}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="edit-section">
            <div className="edit-section-title">CDATA Content</div>
            <p className="form-hint" style={{ marginBottom: 12 }}>
              CDATA allows raw content including special XML characters (&lt;, &gt;, &amp;, &quot;).
              The content will be wrapped in <code>&lt;![CDATA[ ... ]]&gt;</code> in the XML output.
            </p>
            <div className="form-group">
              <textarea
                className="cdata-textarea"
                value={cdata}
                onChange={(e) => setCdata(e.target.value)}
                placeholder="Enter CDATA content... special characters are allowed here."
                rows={10}
                spellCheck={false}
                autoFocus
              />
            </div>
            {cdata.length > 0 && (
              <div className="field-hint" style={{ marginTop: 6, color: '#88cc88' }}>
                Preview: <code>&lt;![CDATA[{cdata.length} chars]]&gt;</code>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={() => { onSave(undefined); onClose(); }}
          >
            Clear CDATA
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default CdataEditModal;

import React from 'react';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: 'General',
    items: [
      { keys: ['?', 'F1'], description: 'Show keyboard shortcuts' },
      { keys: ['Ctrl', 'S'], description: 'Export tree as XML' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternate)' },
    ],
  },
  {
    category: 'Selection',
    items: [
      { keys: ['Ctrl', 'A'], description: 'Select all nodes' },
      { keys: ['Escape'], description: 'Deselect / cancel' },
      { keys: ['Ctrl', 'Click'], description: 'Multi-select nodes' },
    ],
  },
  {
    category: 'Editing',
    items: [
      { keys: ['Delete', 'Backspace'], description: 'Delete selected node(s)' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected node' },
      { keys: ['Ctrl', 'V'], description: 'Paste node' },
    ],
  },
  {
    category: 'Canvas',
    items: [
      { keys: ['/'], description: 'Search nodes' },
      { keys: ['F'], description: 'Fit view' },
      { keys: ['↑', '↓', '←', '→'], description: 'Nudge selected node(s)' },
      { keys: ['Ctrl', 'Drag'], description: 'Drag entire subtree' },
      { keys: ['Alt', 'Drag'], description: 'Drag entire subtree (quick mode)' },
    ],
  },
];

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ alignItems: 'flex-start', paddingTop: 60 }}
    >
      <div
        className="modal-content"
        style={{ minWidth: 420, maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span style={{ fontSize: 18 }}>⌨️</span>
            <span className="modal-node-type">Keyboard Shortcuts</span>
          </div>
          <button className="modal-close" onClick={onClose} title="Close (Escape)">
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: '12px 16px' }}>
          {SHORTCUTS.map((group) => (
            <div key={group.category} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#6677aa',
                  marginBottom: 6,
                  paddingBottom: 4,
                  borderBottom: '1px solid #2a3a5a',
                }}
              >
                {group.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: 12, color: '#99aabb' }}>{item.description}</span>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      {item.keys.map((key, i) => (
                        <React.Fragment key={key + i}>
                          {i > 0 && (
                            <span style={{ fontSize: 10, color: '#445', margin: '0 1px' }}>/</span>
                          )}
                          <kbd
                            style={{
                              background: '#1e2840',
                              border: '1px solid #3a4a6a',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: '#c8e0ff',
                              minWidth: 20,
                              textAlign: 'center',
                              display: 'inline-block',
                              boxShadow: '0 1px 0 #3a4a6a',
                            }}
                          >
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="modal-footer"
          style={{ justifyContent: 'center', borderTop: '1px solid #2a3a5a', padding: '8px 16px' }}
        >
          <span style={{ fontSize: 11, color: '#556677' }}>
            Press <kbd style={{ background: '#1e2840', border: '1px solid #3a4a6a', borderRadius: 3, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', color: '#c8e0ff' }}>?</kbd> or{' '}
            <kbd style={{ background: '#1e2840', border: '1px solid #3a4a6a', borderRadius: 3, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', color: '#c8e0ff' }}>F1</kbd> to toggle this
            panel
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;

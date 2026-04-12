import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/btStore';

const TreeManager: React.FC = () => {
  const { t } = useTranslation();
  const { project, activeTreeId, setActiveTree, addTree, renameTree, deleteTree, setMainTree } =
    useBTStore();
  const [newTreeId, setNewTreeId] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleAdd = () => {
    const id = newTreeId.trim();
    if (!id) return;
    addTree(id);
    setNewTreeId('');
  };

  const startRename = (id: string) => {
    setRenaming(id);
    setRenameValue(id);
  };

  const commitRename = (oldId: string) => {
    const newId = renameValue.trim();
    if (newId && newId !== oldId) renameTree(oldId, newId);
    setRenaming(null);
  };

  return (
    <div className="panel tree-manager">
      <div className="panel-header">{t('treeManager.panel')}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {project.trees.map((tree) => {
          const isActive = tree.id === activeTreeId;
          const isMain = tree.id === project.mainTreeId;
          const isRenaming = renaming === tree.id;

          return (
            <div
              key={tree.id}
              className={`tree-item${isActive ? ' active' : ''}`}
              onClick={() => !isRenaming && setActiveTree(tree.id)}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(tree.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(tree.id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#1a1a2e',
                    border: '1px solid #4a80d0',
                    color: '#ccd',
                    borderRadius: 3,
                    padding: '2px 4px',
                    fontSize: 12,
                    flex: 1,
                  }}
                />
              ) : (
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isMain && <span style={{ color: '#f0a020', marginRight: 4 }}>★</span>}
                  {tree.id}
                </span>
              )}

              {!isRenaming && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {!isMain && (
                    <button
                      className="tree-btn"
                      title="Set as main tree"
                      onClick={(e) => { e.stopPropagation(); setMainTree(tree.id); }}
                    >★</button>
                  )}
                  <button
                    className="tree-btn"
                    title="Rename"
                    onClick={(e) => { e.stopPropagation(); startRename(tree.id); }}
                  >✎</button>
                  <button
                    className="tree-btn danger"
                    title={t('treeManager.delete')}
                    onClick={(e) => { e.stopPropagation(); deleteTree(tree.id); }}
                  >✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        <input
          value={newTreeId}
          onChange={(e) => setNewTreeId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t('treeManager.newTreePlaceholder')}
          style={{
            flex: 1,
            background: '#1a1a2e',
            border: '1px solid #334',
            color: '#ccd',
            borderRadius: 4,
            padding: '4px 6px',
            fontSize: 12,
          }}
        />
        <button className="btn-primary" onClick={handleAdd}>+</button>
      </div>
    </div>
  );
};

export default TreeManager;

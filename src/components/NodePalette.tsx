import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import { CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeCategory, BTNodeDefinition } from '../types/bt';
import NodeModelModal from './NodeModelModal';

const CATEGORIES: BTNodeCategory[] = ['Action', 'Condition', 'Control', 'Decorator', 'SubTree'].sort((a, b) => a.localeCompare(b)) as BTNodeCategory[];

const NodePalette: React.FC = () => {
  const { t } = useTranslation();
  const { project, addNodeModel, updateNodeModel, deleteNodeModel } = useBTStore();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  // Model modal state: null = closed, 'create' = create new, BTNodeDefinition = edit existing
  const [modelModal, setModelModal] = useState<
    { mode: 'create'; defaultCategory: BTNodeCategory }
    | { mode: 'edit'; def: BTNodeDefinition }
    | { mode: 'view'; def: BTNodeDefinition }
    | null
  >(null);

  // Filter nodes by search query
  const filteredNodes = searchQuery.trim()
    ? project.nodeModels.filter((m) =>
        m.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null; // null means no search, show all by category

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const byCategory = (cat: BTNodeCategory) =>
    project.nodeModels.filter((m) => m.category === cat).sort((a, b) => a.type.localeCompare(b.type));

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/btnode-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCreate = (def: BTNodeDefinition) => {
    addNodeModel(def);
  };

  const handleUpdate = (def: BTNodeDefinition) => {
    updateNodeModel(def);
    setModelModal(null);
  };

  const handleDelete = (type: string) => {
    if (window.confirm(`Delete custom node "${type}"?`)) {
      deleteNodeModel(type);
    }
  };

  const toggleCollapse = () => setCollapsed((c) => !c);

  return (
    <div className={`panel node-palette${collapsed ? ' collapsed' : ''}`}>
      <div className="panel-header" onClick={toggleCollapse}>
        <span>Models Palette</span>
        <span className="collapse-icon">{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
      <div className="panel-body node-palette-body">
        <div className="node-palette-scroll">
          {/* Search box */}
          <div style={{ padding: '8px 8px 4px 8px' }}>
            <input
              type="text"
              placeholder={t('palette.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#0d0d1a',
                border: '1px solid #334',
                borderRadius: 4,
                color: '#ccd',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Search results or category list */}
          {filteredNodes !== null ? (
            <div style={{ padding: '4px 4px 0 4px' }}>
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => {
                  const colors = CATEGORY_COLORS[node.category];
                  return (
                    <PaletteItem
                      key={node.type}
                      def={node}
                      colors={colors}
                      onDragStart={onDragStart}
                      customModelLabel={t('palette.customModel')}
                      onOpen={() => setModelModal({ mode: 'view', def: node })}
                      onEdit={!node.builtin ? () => setModelModal({ mode: 'edit', def: node }) : undefined}
                      onDelete={!node.builtin ? deleteNodeModel : undefined}
                    />
                  );
                })
              ) : (
                <div style={{ fontSize: 11, color: '#556', padding: '8px' }}>
                  No models match &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          ) : (
            CATEGORIES.map((cat) => {
              const nodes = byCategory(cat);
              const colors = CATEGORY_COLORS[cat];
              const isExpanded = expandedCats.has(cat);

              return (
                <div key={cat} style={{ marginBottom: 4 }}>
                  <button
                    className="cat-header"
                    style={{ borderColor: colors.border, color: colors.text }}
                    onClick={() => toggleCat(cat)}
                  >
                    <span>{isExpanded ? '▼' : '▶'} {cat}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{nodes.length}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ paddingLeft: 4 }}>
                      {nodes.map((node) => (
                        <PaletteItem
                          key={node.type}
                          def={node}
                          colors={colors}
                          onDragStart={onDragStart}
                          customModelLabel={t('palette.customModel')}
                          onOpen={() => setModelModal({ mode: 'view', def: node })}
                          onEdit={!node.builtin ? () => setModelModal({ mode: 'edit', def: node }) : undefined}
                          onDelete={!node.builtin ? deleteNodeModel : undefined}
                        />
                      ))}
                      {nodes.length === 0 && (
                        <div style={{ fontSize: 11, color: '#556', padding: '4px 8px' }}>
                          No nodes
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add custom node button */}
        <div className="node-palette-footer">
          <button
            className="btn-primary"
            onClick={() => setModelModal({ mode: 'create', defaultCategory: 'Action' })}
            style={{ width: '100%' }}
          >
            + Add Model
          </button>
        </div>

      {/* Node Model Modal (Create or Edit) */}
      {modelModal?.mode === 'create' && (
        <NodeModelModal
          mode="create"
          defaultCategory={modelModal.defaultCategory}
          existingModels={project.nodeModels}
          onSave={handleCreate}
          onClose={() => setModelModal(null)}
        />
      )}
      {modelModal?.mode === 'edit' && (
        <NodeModelModal
          mode="edit"
          nodeDef={modelModal.def}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setModelModal(null)}
        />
      )}
      {modelModal?.mode === 'view' && (
        <NodeModelModal
          mode="view"
          nodeDef={modelModal.def}
          onClose={() => setModelModal(null)}
        />
      )}
      </div>
      )}
    </div>
  );
};

interface PaletteItemProps {
  def: BTNodeDefinition;
  colors: { bg: string; border: string; text: string };
  onDragStart: (e: React.DragEvent, type: string) => void;
  customModelLabel: string;
  onOpen?: (def: BTNodeDefinition) => void;
  onEdit?: (def: BTNodeDefinition) => void;
  onDelete?: (type: string) => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ def, colors, onDragStart, customModelLabel, onOpen, onEdit, onDelete }) => (
  <div className="palette-item-wrapper">
    <div
      draggable
      onDragStart={(e) => onDragStart(e, def.type)}
      onDoubleClick={() => onOpen?.(def)}
      className="palette-item"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
      title={def.description || def.type}
    >
      <span className="palette-item-label" style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {!def.builtin && (
          <span
            className="palette-custom-icon"
            title={customModelLabel}
            aria-label={customModelLabel}
          >
            ★
          </span>
        )}
        {def.type}
      </span>
    </div>
    {(onEdit || onDelete) && (
      <div className="palette-item-actions">
        {onEdit && (
          <button
            onClick={() => onEdit(def)}
            className="palette-item-btn"
            title="Edit model"
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(def.type); }}
            className="palette-item-btn danger"
            title="Delete model"
          >
            ✕
          </button>
        )}
      </div>
    )}
  </div>
);

export default NodePalette;

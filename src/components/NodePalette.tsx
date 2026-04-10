import React, { useState } from 'react';
import { useBTStore } from '../store/btStore';
import { CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeCategory, BTNodeDefinition } from '../types/bt';
import NodeModelModal from './NodeModelModal';

const CATEGORIES: BTNodeCategory[] = ['Control', 'Decorator', 'Action', 'Condition', 'SubTree'];

const NodePalette: React.FC = () => {
  const { project, addNodeModel, updateNodeModel, deleteNodeModel } = useBTStore();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));

  // Model modal state: null = closed, 'create' = create new, BTNodeDefinition = edit existing
  const [modelModal, setModelModal] = useState<{ mode: 'create'; defaultCategory: BTNodeCategory } | { mode: 'edit'; def: BTNodeDefinition } | null>(null);

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

  return (
    <div className="panel node-palette">
      <div className="panel-header">Node Palette</div>

      {CATEGORIES.map((cat) => {
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
      })}

      {/* Add custom node button */}
      <div style={{ marginTop: 12, borderTop: '1px solid #334', paddingTop: 8 }}>
        <button
          className="btn-primary"
          onClick={() => setModelModal({ mode: 'create', defaultCategory: 'Action' })}
          style={{ width: '100%' }}
        >
          + Add Custom Node
        </button>
      </div>

      {/* Node Model Modal (Create or Edit) */}
      {modelModal?.mode === 'create' && (
        <NodeModelModal
          mode="create"
          defaultCategory={modelModal.defaultCategory}
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
    </div>
  );
};

interface PaletteItemProps {
  def: BTNodeDefinition;
  colors: { bg: string; border: string; text: string };
  onDragStart: (e: React.DragEvent, type: string) => void;
  onEdit?: (def: BTNodeDefinition) => void;
  onDelete?: (type: string) => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ def, colors, onDragStart, onEdit, onDelete }) => (
  <div className="palette-item-wrapper">
    <div
      draggable
      onDragStart={(e) => onDragStart(e, def.type)}
      className="palette-item"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
      title={def.description || def.type}
    >
      <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {def.type}
      </span>
    </div>
    {(onEdit || onDelete) && (
      <div className="palette-item-actions">
        {onEdit && (
          <button
            onClick={() => onEdit(def)}
            className="palette-item-btn"
            title="Edit node model"
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(def.type); }}
            className="palette-item-btn danger"
            title="Delete node model"
          >
            ✕
          </button>
        )}
      </div>
    )}
  </div>
);

export default NodePalette;

import React, { useState } from 'react';
import { useBTStore } from '../store/btStore';
import { CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeCategory, BTNodeDefinition } from '../types/bt';

const CATEGORIES: BTNodeCategory[] = ['Control', 'Decorator', 'Leaf', 'SubTree'];

const NodePalette: React.FC = () => {
  const { project, addNodeModel, deleteNodeModel } = useBTStore();
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeCat, setNewNodeCat] = useState<BTNodeCategory>('Leaf');

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const byCategory = (cat: BTNodeCategory) =>
    project.nodeModels.filter((m) => m.category === cat);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/btnode-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = () => {
    const trimmed = newNodeName.trim();
    if (!trimmed) return;
    const existing = project.nodeModels.find((m) => m.type === trimmed);
    if (existing) {
      alert(`Node type "${trimmed}" already exists`);
      return;
    }
    const def: BTNodeDefinition = { type: trimmed, category: newNodeCat };
    addNodeModel(def);
    setNewNodeName('');
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
                    onDelete={!node.builtin ? deleteNodeModel : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add custom node */}
      <div style={{ marginTop: 12, borderTop: '1px solid #334', paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 4 }}>Add Custom Node</div>
        <input
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
          placeholder="NodeTypeName"
          style={{
            width: '100%',
            background: '#1a1a2e',
            border: '1px solid #334',
            color: '#ccd',
            borderRadius: 4,
            padding: '4px 6px',
            fontSize: 12,
            boxSizing: 'border-box',
            marginBottom: 4,
          }}
        />
        <select
          value={newNodeCat}
          onChange={(e) => setNewNodeCat(e.target.value as BTNodeCategory)}
          style={{
            width: '100%',
            background: '#1a1a2e',
            border: '1px solid #334',
            color: '#ccd',
            borderRadius: 4,
            padding: '4px 6px',
            fontSize: 12,
            boxSizing: 'border-box',
            marginBottom: 4,
          }}
        >
          <option value="Leaf">Action / Condition</option>
          <option value="Control">Control</option>
          <option value="Decorator">Decorator</option>
        </select>
        <button className="btn-primary" onClick={handleAddNode} style={{ width: '100%' }}>
          + Add Node
        </button>
      </div>
    </div>
  );
};

interface PaletteItemProps {
  def: BTNodeDefinition;
  colors: { bg: string; border: string; text: string };
  onDragStart: (e: React.DragEvent, type: string) => void;
  onDelete?: (type: string) => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ def, colors, onDragStart, onDelete }) => (
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
    {onDelete && (
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(def.type); }}
        style={{
          background: 'none',
          border: 'none',
          color: '#e04040',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: 12,
          lineHeight: 1,
        }}
        title="Delete custom node"
      >
        ✕
      </button>
    )}
  </div>
);

export default NodePalette;

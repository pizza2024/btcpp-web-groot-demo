import React, { useState, useRef, useEffect } from 'react';
import { useBTStore } from '../store/btStore';
import { CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeCategory } from '../types/bt';

interface NodePickerProps {
  position: { x: number; y: number };
  onSelect: (nodeType: string, category: BTNodeCategory) => void;
  onClose: () => void;
}

const CATEGORIES: BTNodeCategory[] = ['Action', 'Condition', 'Control', 'Decorator', 'SubTree'].sort((a, b) => a.localeCompare(b)) as BTNodeCategory[];

const NodePicker: React.FC<NodePickerProps> = ({ position, onSelect, onClose }) => {
  const { project } = useBTStore();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Get all node models from project
  const allModels = project.nodeModels;

  // Filter by search
  const filtered = search.trim()
    ? allModels.filter(m =>
        m.type.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase())
      )
    : allModels;

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(m => m.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<BTNodeCategory, typeof allModels>);

  const handleSelect = (type: string, category: BTNodeCategory) => {
    onSelect(type, category);
    onClose();
  };

  // Calculate position to avoid viewport overflow
  const pickerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y + 10,
    zIndex: 1000,
    width: 260,
    maxHeight: 400,
    overflow: 'auto',
  };

  return (
    <div ref={containerRef} className="node-picker" style={pickerStyle}>
      {/* Search input */}
      <div className="node-picker-search">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="node-picker-input"
        />
      </div>

      {/* Node list */}
      <div className="node-picker-list">
        {Object.keys(grouped).length === 0 ? (
          <div className="node-picker-empty">No nodes found</div>
        ) : (
          Object.entries(grouped).map(([cat, models]) => (
            <div key={cat} className="node-picker-category">
              <div className="node-picker-category-header">{cat}</div>
              {models.map(model => {
                const colors = CATEGORY_COLORS[model.category] || CATEGORY_COLORS.Control;
                return (
                  <div
                    key={model.type}
                    className="node-picker-item"
                    onClick={() => handleSelect(model.type, model.category)}
                    style={{ borderLeftColor: colors.border }}
                  >
                    <span className="node-picker-item-type">{model.type}</span>
                    {model.description && (
                      <span className="node-picker-item-desc">{model.description}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NodePicker;

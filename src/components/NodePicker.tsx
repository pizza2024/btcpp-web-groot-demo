import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import { CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeCategory } from '../types/bt';

interface NodePickerProps {
  position: { x: number; y: number };
  onSelect: (nodeType: string, category: BTNodeCategory) => void;
  onClose: () => void;
}

const CATEGORIES: BTNodeCategory[] = ['Action', 'Condition', 'Control', 'Decorator', 'SubTree'].sort((a, b) => a.localeCompare(b)) as BTNodeCategory[];

const NodePicker: React.FC<NodePickerProps> = ({ position, onSelect, onClose }) => {
  const { t } = useTranslation();
  const { project } = useBTStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [expandedCategories, setExpandedCategories] = useState<Set<BTNodeCategory>>(new Set(CATEGORIES));
  const [selectedCategory, setSelectedCategory] = useState<'All' | BTNodeCategory>('All');

  // Adjust position to stay within viewport
  useEffect(() => {
    const PICKER_WIDTH = 260;
    const PICKER_MAX_HEIGHT = 400;
    const PADDING = 10;

    let { x, y } = position;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if overflow right
    if (x + PICKER_WIDTH + PADDING > viewportWidth) {
      x = viewportWidth - PICKER_WIDTH - PADDING;
    }
    // Adjust horizontal position if overflow left
    if (x < PADDING) {
      x = PADDING;
    }

    // Adjust vertical position if overflow bottom
    if (y + PICKER_MAX_HEIGHT + PADDING > viewportHeight) {
      y = viewportHeight - PICKER_MAX_HEIGHT - PADDING;
    }
    // Adjust vertical position if overflow top
    if (y < PADDING) {
      y = PADDING;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside pointer interaction (capture phase avoids canvas stopPropagation)
  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => document.removeEventListener('pointerdown', handleClickOutside, true);
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
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = allModels.filter((m) => {
    const matchesSearch = !normalizedSearch
      || m.type.toLowerCase().includes(normalizedSearch)
      || m.description?.toLowerCase().includes(normalizedSearch);
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(m => m.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<BTNodeCategory, typeof allModels>);

  const toggleCategory = (category: BTNodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSelect = (type: string, category: BTNodeCategory) => {
    onSelect(type, category);
    onClose();
  };

  // Calculate position to avoid viewport overflow
  const pickerStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjustedPosition.x,
    top: adjustedPosition.y + 10,
    zIndex: 1000,
    width: 260,
    maxHeight: 400,
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
          placeholder={t('palette.searchNodesPlaceholder')}
          className="node-picker-input"
        />
        <div className="node-picker-filters">
          <button
            type="button"
            className={`node-picker-filter-btn${selectedCategory === 'All' ? ' active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            {t('properties.category')}: {t('palette.allCategories')}
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`node-picker-filter-btn${selectedCategory === category ? ' active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Node list */}
      <div className="node-picker-list">
        {Object.keys(grouped).length === 0 ? (
          <div className="node-picker-empty">{t('palette.noNodesFound')}</div>
        ) : (
          Object.entries(grouped).map(([cat, models]) => {
            const category = cat as BTNodeCategory;
            const expanded = expandedCategories.has(category);
            return (
            <div key={cat} className="node-picker-category">
              <button
                type="button"
                className="node-picker-category-header"
                onClick={() => toggleCategory(category)}
                aria-expanded={expanded}
              >
                <span>{expanded ? '▼' : '▶'} {cat}</span>
                <span className="node-picker-category-count">{models.length}</span>
              </button>
              {expanded && models.map(model => {
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default NodePicker;

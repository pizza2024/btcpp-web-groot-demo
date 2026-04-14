import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import type { BTNodeCategory } from '../types/bt';
import { CATEGORY_COLORS } from '../types/bt-constants';
import { useTranslation } from 'react-i18next';

interface NodeSearchModalProps {
  nodes: Node[];
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}

const CATEGORIES: BTNodeCategory[] = ['Action', 'Condition', 'Control', 'Decorator', 'SubTree'].sort((a, b) => a.localeCompare(b)) as BTNodeCategory[];

const NodeSearchModal: React.FC<NodeSearchModalProps> = ({ nodes, onSelect, onClose }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | BTNodeCategory>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter nodes by label or type
  const filtered = query.trim()
    ? nodes.filter((n) => {
        const label = (n.data.label as string || '').toLowerCase();
        const type = (n.data.nodeType as string || '').toLowerCase();
        const category = (n.data.category as BTNodeCategory | undefined) ?? 'Action';
        const q = query.toLowerCase();
        const matchesText = label.includes(q) || type.includes(q);
        const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
        return matchesText && matchesCategory;
      })
    : nodes.filter((n) => {
        if (selectedCategory === 'All') return true;
        const category = (n.data.category as BTNodeCategory | undefined) ?? 'Action';
        return category === selectedCategory;
      });

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].id);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
    },
    [filtered, selectedIndex, onSelect, onClose]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Action'];
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{ alignItems: 'flex-start', paddingTop: 80, zIndex: 1100 }}
    >
      <div
        className="modal-content"
        style={{ width: 420, maxHeight: 'calc(100vh - 160px)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid #2a3a5a',
          }}
        >
          <span style={{ color: '#667', fontSize: 16 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('palette.searchNodesPlaceholder')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e0e8f8',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              background: '#1e2840',
              border: '1px solid #3a4a6a',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#667',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Category filter */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '8px 14px 10px',
            borderBottom: '1px solid #2a3a5a',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            style={{
              border: selectedCategory === 'All' ? '1px solid #5b8def' : '1px solid #3a4a6a',
              background: selectedCategory === 'All' ? '#23385f' : '#1e2840',
              color: selectedCategory === 'All' ? '#e0e8ff' : '#8899bb',
              borderRadius: 4,
              fontSize: 11,
              padding: '3px 8px',
              cursor: 'pointer',
            }}
          >
            {t('properties.category')}: {t('palette.allCategories', { defaultValue: 'All' })}
          </button>
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            const colors = getCategoryColor(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                style={{
                  border: isActive ? `1px solid ${colors.border}` : '1px solid #3a4a6a',
                  background: isActive ? colors.bg : '#1e2840',
                  color: isActive ? colors.text : '#8899bb',
                  borderRadius: 4,
                  fontSize: 11,
                  padding: '3px 8px',
                  cursor: 'pointer',
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            maxHeight: 360,
            padding: '4px 0',
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: '#556677',
                fontSize: 13,
              }}
            >
              {t('palette.noNodesFound')}
            </div>
          ) : (
            filtered.map((node, index) => {
              const data = node.data as {
                label?: string;
                nodeType?: string;
                category?: string;
                colors?: { bg: string; text: string; border: string };
              };
              const colors = data.colors ?? getCategoryColor(data.category ?? 'Action');
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={node.id}
                  onClick={() => onSelect(node.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    background: isSelected ? '#2a3a5a' : 'transparent',
                    borderLeft: isSelected ? '2px solid #5b8def' : '2px solid transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Category color dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: colors.bg,
                      flexShrink: 0,
                    }}
                  />
                  {/* Node info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: isSelected ? '#e0e8ff' : '#c0cce0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {data.label || data.nodeType}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#556677',
                        fontFamily: 'monospace',
                      }}
                    >
                      {data.nodeType}
                    </div>
                  </div>
                  {/* Category badge */}
                  <span
                    style={{
                      fontSize: 10,
                      color: colors.text,
                      background: colors.bg,
                      padding: '2px 6px',
                      borderRadius: 3,
                      flexShrink: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      opacity: 0.85,
                    }}
                  >
                    {data.category}
                  </span>
                  {/* Keyboard hint when selected */}
                  {isSelected && (
                    <kbd
                      style={{
                        background: '#1e2840',
                        border: '1px solid #3a4a6a',
                        borderRadius: 3,
                        padding: '1px 5px',
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: '#556677',
                        flexShrink: 0,
                      }}
                    >
                      ↵
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '6px 14px',
            borderTop: '1px solid #2a3a5a',
            fontSize: 11,
            color: '#445566',
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  );
};

export default NodeSearchModal;

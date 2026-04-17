import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import { CATEGORY_COLORS } from '../types/bt-constants';
import type { BTNodeCategory, BTNodeDefinition } from '../types/bt';
import NodeModelModal from './NodeModelModal';
import { useBTEditorIntegration, isIntegrationReadonly } from '../integration/context';

const CATEGORIES: BTNodeCategory[] = ['Action', 'Condition', 'Control', 'Decorator', 'SubTree'].sort((a, b) =>
  a.localeCompare(b)
) as BTNodeCategory[];

type PaletteEntry = {
  def: BTNodeDefinition;
  displayLabel?: string;
  subtreeTarget?: string;
  isGeneratedSubTree?: boolean;
};

const NodePalette: React.FC = () => {
  const { t } = useTranslation();
  const integration = useBTEditorIntegration();
  const { project, theme } = useBTStore();
  const isLightTheme = theme === 'light';
  const readonly = isIntegrationReadonly(integration);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [modelModal, setModelModal] = useState<
    { mode: 'create'; defaultCategory: BTNodeCategory }
    | { mode: 'edit'; def: BTNodeDefinition }
    | { mode: 'view'; def: BTNodeDefinition }
    | null
  >(null);

  const getPaletteEntries = (category: BTNodeCategory): PaletteEntry[] => {
    if (category !== 'SubTree') {
      return project.nodeModels
        .filter((model) => model.category === category)
        .map((def) => ({ def }))
        .sort((a, b) => a.def.type.localeCompare(b.def.type));
    }

    return project.trees
      .filter((tree) => tree.id !== project.mainTreeId)
      .map((tree) => ({
        def: {
          type: 'SubTree',
          category: 'SubTree' as const,
          description: `SubTree reference to ${tree.id}`,
          builtin: true,
        },
        displayLabel: tree.id,
        subtreeTarget: tree.id,
        isGeneratedSubTree: true,
      }))
      .sort((a, b) => (a.displayLabel ?? a.def.type).localeCompare(b.displayLabel ?? b.def.type));
  };

  const allPaletteEntries = CATEGORIES.flatMap((category) => getPaletteEntries(category));
  const filteredEntries = searchQuery.trim()
    ? allPaletteEntries.filter((entry) => {
        const label = (entry.displayLabel ?? entry.def.type).toLowerCase();
        const query = searchQuery.toLowerCase();
        return (
          label.includes(query)
          || entry.def.type.toLowerCase().includes(query)
          || entry.def.description?.toLowerCase().includes(query)
          || entry.def.category.toLowerCase().includes(query)
        );
      })
    : null;

  const toggleCat = (category: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, subtreeTarget?: string) => {
    if (readonly) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData('application/btnode-type', nodeType);
    if (subtreeTarget) {
      event.dataTransfer.setData('application/bt-subtree-target', subtreeTarget);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCreate = (def: BTNodeDefinition) => {
    integration?.modelActions.addNodeModel(def, 'user');
  };

  const handleUpdate = (def: BTNodeDefinition) => {
    integration?.modelActions.updateNodeModel(def, 'user');
    setModelModal(null);
  };

  const handleDelete = (type: string) => {
    if (readonly) return;
    const confirmed = integration?.adapters.notifyAdapter.confirm(`Delete custom node "${type}"?`) ?? false;
    if (confirmed) {
      integration?.modelActions.deleteNodeModel(type, 'user');
    }
  };

  return (
    <div className={`panel node-palette${collapsed ? ' collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setCollapsed((value) => !value)}>
        <span>Models Palette</span>
        <span className="collapse-icon">{collapsed ? '▶' : '▼'}</span>
      </div>

      {!collapsed && (
        <div className="panel-body node-palette-body">
          <div className="node-palette-scroll">
            <div style={{ padding: '8px 8px 4px 8px' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  className="node-palette-search-input"
                  type="text"
                  placeholder={t('palette.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 4,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    boxShadow: isLightTheme ? '0 1px 0 rgba(74, 128, 208, 0.14)' : 'none',
                  }}
                />
                <button
                  type="button"
                  title="Collapse all categories"
                  onClick={() => setExpandedCats(new Set())}
                  style={{
                    flexShrink: 0,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 4,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px 7px',
                    fontSize: 11,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⊟
                </button>
              </div>
            </div>

            {filteredEntries !== null ? (
              <div style={{ padding: '4px 4px 0 4px' }}>
                {filteredEntries.length > 0 ? (
                  CATEGORIES.map((category) => {
                    const matching = filteredEntries.filter((entry) => entry.def.category === category);
                    if (matching.length === 0) return null;

                    return (
                      <PaletteGroup
                        key={category}
                        category={category}
                        count={matching.length}
                        colors={CATEGORY_COLORS[category]}
                        isExpanded={true}
                        onToggle={() => toggleCat(category)}
                        isLightTheme={isLightTheme}
                      >
                        {matching.map((entry) => (
                          <PaletteItem
                            key={`${entry.def.type}:${entry.displayLabel ?? entry.def.type}`}
                            def={entry.def}
                            displayLabel={entry.displayLabel}
                            subtreeTarget={entry.subtreeTarget}
                            isGeneratedSubTree={entry.isGeneratedSubTree}
                            colors={CATEGORY_COLORS[category]}
                            onDragStart={onDragStart}
                            draggable={!readonly}
                            customModelLabel={t('palette.customModel')}
                            onOpen={entry.isGeneratedSubTree ? undefined : () => setModelModal({ mode: 'view', def: entry.def })}
                            onEdit={!readonly && !entry.def.builtin && !entry.isGeneratedSubTree ? () => setModelModal({ mode: 'edit', def: entry.def }) : undefined}
                            onDelete={!readonly && !entry.def.builtin && !entry.isGeneratedSubTree ? handleDelete : undefined}
                          />
                        ))}
                      </PaletteGroup>
                    );
                  }).filter(Boolean)
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px' }}>
                    No models match &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            ) : (
              CATEGORIES.map((category) => {
                const entries = getPaletteEntries(category);
                const isExpanded = expandedCats.has(category);

                return (
                  <PaletteGroup
                    key={category}
                    category={category}
                    count={entries.length}
                    colors={CATEGORY_COLORS[category]}
                    isExpanded={isExpanded}
                    onToggle={() => toggleCat(category)}
                    isLightTheme={isLightTheme}
                  >
                    {entries.map((entry) => (
                      <PaletteItem
                        key={`${entry.def.type}:${entry.displayLabel ?? entry.def.type}`}
                        def={entry.def}
                        displayLabel={entry.displayLabel}
                        subtreeTarget={entry.subtreeTarget}
                        isGeneratedSubTree={entry.isGeneratedSubTree}
                        colors={CATEGORY_COLORS[category]}
                        onDragStart={onDragStart}
                        draggable={!readonly}
                        customModelLabel={t('palette.customModel')}
                        onOpen={entry.isGeneratedSubTree ? undefined : () => setModelModal({ mode: 'view', def: entry.def })}
                        onEdit={!readonly && !entry.def.builtin && !entry.isGeneratedSubTree ? () => setModelModal({ mode: 'edit', def: entry.def }) : undefined}
                        onDelete={!readonly && !entry.def.builtin && !entry.isGeneratedSubTree ? handleDelete : undefined}
                      />
                    ))}
                    {entries.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px' }}>
                        No nodes
                      </div>
                    )}
                  </PaletteGroup>
                );
              })
            )}
          </div>

          <div className="node-palette-footer">
            <button
              className="btn-primary"
              onClick={() => setModelModal({ mode: 'create', defaultCategory: 'Action' })}
              style={{ width: '100%' }}
              disabled={readonly}
            >
              + Add Model
            </button>
          </div>

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

const PaletteGroup: React.FC<{
  category: string;
  count: number;
  colors: { bg: string; border: string; text: string };
  isExpanded: boolean;
  onToggle: () => void;
  isLightTheme: boolean;
  children: React.ReactNode;
}> = ({ category, count, colors, isExpanded, onToggle, isLightTheme, children }) => (
  <div style={{ marginBottom: 4 }}>
    <button
      className="cat-header"
      style={{
        borderColor: isLightTheme ? `${colors.border}99` : colors.border,
        background: isLightTheme ? `${colors.bg}1f` : colors.bg,
        color: isLightTheme ? colors.border : colors.text,
      }}
      onClick={onToggle}
    >
      <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
        {isExpanded ? '▼' : '▶'} {category}
      </span>
      <span style={{ fontSize: 10, opacity: isLightTheme ? 0.9 : 0.75 }}>{count}</span>
    </button>
    {isExpanded && <div style={{ paddingLeft: 4 }}>{children}</div>}
  </div>
);

interface PaletteItemProps {
  def: BTNodeDefinition;
  displayLabel?: string;
  subtreeTarget?: string;
  isGeneratedSubTree?: boolean;
  colors: { bg: string; border: string; text: string };
  onDragStart: (e: React.DragEvent, type: string, subtreeTarget?: string) => void;
  draggable?: boolean;
  customModelLabel: string;
  onOpen?: (def: BTNodeDefinition) => void;
  onEdit?: (def: BTNodeDefinition) => void;
  onDelete?: (type: string) => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({
  def,
  displayLabel,
  subtreeTarget,
  isGeneratedSubTree,
  colors,
  onDragStart,
  draggable = true,
  customModelLabel,
  onOpen,
  onEdit,
  onDelete,
}) => (
  <div className="palette-item-wrapper">
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, def.type, subtreeTarget)}
      onDoubleClick={() => onOpen?.(def)}
      className="palette-item"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
      title={def.description || displayLabel || def.type}
    >
      <span className="palette-item-label" style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isGeneratedSubTree && <span style={{ marginRight: 6, opacity: 0.85 }}>🌳</span>}
        {!def.builtin && (
          <span className="palette-custom-icon" title={customModelLabel} aria-label={customModelLabel}>
            ★
          </span>
        )}
        {displayLabel ?? def.type}
      </span>
    </div>
    {(onEdit || onDelete) && (
      <div className="palette-item-actions">
        {onEdit && (
          <button onClick={() => onEdit(def)} className="palette-item-btn" title="Edit model">
            ✎
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(def.type);
            }}
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

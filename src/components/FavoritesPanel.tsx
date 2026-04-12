import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/btStore';

interface FavoriteTemplate {
  id: string;
  name: string;
  type: string; // node type
  ports?: Record<string, string>;
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  category: string;
  createdAt: number;
}

interface FavoritesPanelProps {
  onDragStart?: (template: FavoriteTemplate, event: React.DragEvent) => void;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ onDragStart }) => {
  const { t } = useTranslation();
  const { favorites, addFavorite, removeFavorite } = useBTStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleDragStart = (e: React.DragEvent, template: FavoriteTemplate) => {
    e.dataTransfer.setData('application/bt-template', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(template, e);
  };

  const handleEditStart = (template: FavoriteTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
  };

  const handleEditSave = (template: FavoriteTemplate) => {
    if (editName.trim() && editName !== template.name) {
      useBTStore.getState().updateFavorite(template.id, editName.trim());
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, template: FavoriteTemplate) => {
    if (e.key === 'Enter') {
      handleEditSave(template);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Action': return '#4a9f4a';
      case 'Condition': return '#4a7fd4';
      case 'Decorator': return '#9f4a9f';
      case 'SubTree': return '#d47f4a';
      default: return '#888';
    }
  };

  if (isCollapsed) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 5,
          background: '#1e2235',
          border: '1px solid #334',
          borderRadius: 6,
          padding: '8px 12px',
          cursor: 'pointer',
        }}
        onClick={() => setIsCollapsed(false)}
        title={t('favorites.title')}
      >
        <span style={{ fontSize: 14 }}>⭐ {favorites.length}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 5,
        background: '#1e2235',
        border: '1px solid #334',
        borderRadius: 6,
        width: 220,
        maxHeight: 400,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #334',
          cursor: 'pointer',
        }}
        onClick={() => setIsCollapsed(true)}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#c8e0ff' }}>
          ⭐ {t('favorites.title')} ({favorites.length})
        </span>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#8899bb',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 6px',
          }}
          onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
        >
          ✕
        </button>
      </div>

      {/* Favorites list */}
      <div style={{ overflow: 'auto', maxHeight: 340, padding: 8 }}>
        {favorites.length === 0 ? (
          <div style={{ color: '#667788', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            {t('favorites.empty')}
          </div>
        ) : (
          favorites.map((fav) => (
            <div
              key={fav.id}
              draggable
              onDragStart={(e) => handleDragStart(e, fav)}
              style={{
                background: '#252840',
                border: '1px solid #334',
                borderRadius: 4,
                padding: '6px 10px',
                marginBottom: 6,
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* Drag handle icon */}
              <span style={{ color: '#556677', fontSize: 10 }}>⋮⋮</span>

              {/* Category color dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: getCategoryColor(fav.category),
                  flexShrink: 0,
                }}
              />

              {/* Name */}
              {editingId === fav.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleEditSave(fav)}
                  onKeyDown={(e) => handleEditKeyDown(e, fav)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  style={{
                    flex: 1,
                    background: '#1a1a2e',
                    border: '1px solid #446',
                    borderRadius: 3,
                    color: '#c8e0ff',
                    fontSize: 12,
                    padding: '2px 4px',
                    outline: 'none',
                  }}
                />
              ) : (
                <span
                  style={{ flex: 1, fontSize: 12, color: '#aaccee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onDoubleClick={(e) => { e.stopPropagation(); handleEditStart(fav); }}
                  title={`${fav.type}${fav.ports ? ' - ' + Object.entries(fav.ports).map(([k, v]) => `${k}: ${v}`).join(', ') : ''}`}
                >
                  {fav.name}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFavorite(fav.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667788',
                  cursor: 'pointer',
                  fontSize: 10,
                  padding: '2px 4px',
                }}
                title={t('favorites.remove')}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Hint */}
      {favorites.length > 0 && (
        <div style={{ fontSize: 10, color: '#556677', textAlign: 'center', padding: '4px 8px', borderTop: '1px solid #2a2a3a' }}>
          {t('favorites.hint')}
        </div>
      )}
    </div>
  );
};

export default FavoritesPanel;

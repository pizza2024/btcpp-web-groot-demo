import React, { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Separator below this item (not rendered as button) */
  separator?: boolean;
  action?: () => void;
  /** For submenu items */
  submenu?: MenuItem[];
}

export interface MenuConfig {
  edge?: MenuItem[];
  node?: MenuItem[];
  pane?: MenuItem[];
}

interface ContextMenuProps {
  position: { x: number; y: number };
  targetType: 'edge' | 'node' | 'pane' | null;
  menuConfig: MenuConfig;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ position, targetType, menuConfig, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuId, setSubmenuId] = useState<string | null>(null);

  // Close on left click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use mousedown event which fires before React's onClick
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Get menu items for the current target type
  const menuItems = targetType ? (menuConfig[targetType] ?? []) : [];

  if (!targetType || menuItems.length === 0) {
    return null;
  }

  const renderItem = (item: MenuItem, isSubmenu = false) => {
    if (item.separator) {
      return <div key={item.id} className="context-menu-separator" />;
    }

    if (item.submenu) {
      return (
        <div
          key={item.id}
          className={`context-menu-item context-menu-has-submenu ${item.disabled ? 'disabled' : ''}`}
          onMouseEnter={() => !item.disabled && setSubmenuId(item.id)}
          onMouseLeave={() => !item.disabled && setSubmenuId(null)}
        >
          <span className="context-menu-icon">{item.icon}</span>
          <span className="context-menu-label">{item.label}</span>
          <span className="context-menu-arrow">▶</span>
          {submenuId === item.id && (
            <div className="context-menu-submenu">
              {item.submenu.map(sub => renderItem(sub, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!item.disabled) {
            item.action?.();
            onClose();
          }
        }}
        disabled={item.disabled}
      >
        {item.icon && <span className="context-menu-icon">{item.icon}</span>}
        <span className="context-menu-label">{item.label}</span>
      </button>
    );
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onMouseLeave={() => setSubmenuId(null)}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
    >
      {menuItems.map(item => renderItem(item))}
    </div>
  );
};

// Hook to show context menu
export function useContextMenu() {
  const [menuState, setMenuState] = useState<{
    show: boolean;
    position: { x: number; y: number };
    targetType: 'edge' | 'node' | 'pane' | null;
    targetId: string | null;
  }>({
    show: false,
    position: { x: 0, y: 0 },
    targetType: null,
    targetId: null,
  });

  const showMenu = (
    e: React.MouseEvent,
    targetType: 'edge' | 'node' | 'pane',
    targetId: string | null = null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuState({
      show: true,
      position: { x: e.clientX, y: e.clientY },
      targetType,
      targetId,
    });
  };

  const hideMenu = () => {
    setMenuState((prev) => ({ ...prev, show: false }));
  };

  return {
    menuState,
    showMenu,
    hideMenu,
    ContextMenuComponent: ContextMenu,
  };
}

export default ContextMenu;

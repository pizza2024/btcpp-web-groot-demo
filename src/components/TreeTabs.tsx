import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';

const TreeTabs: React.FC = () => {
  const { t } = useTranslation();
  const {
    project,
    activeTreeId,
    openedTreeIds,
    setActiveTree,
    closeTreeTab,
    closeOtherTreeTabs,
    closeTreeTabsToRight,
  } = useBTStore();
  const [menuState, setMenuState] = React.useState<{ treeId: string; x: number; y: number } | null>(null);

  const existingIds = new Set(project.trees.map((tree) => tree.id));
  const tabs = openedTreeIds.filter((id, index, arr) => existingIds.has(id) && arr.indexOf(id) === index);
  const visibleTabs = tabs.length > 0 ? tabs : [activeTreeId];

  React.useEffect(() => {
    if (!menuState) return;

    const closeMenu = () => setMenuState(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('blur', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('blur', closeMenu);
    };
  }, [menuState]);

  const menuIndex = menuState ? visibleTabs.indexOf(menuState.treeId) : -1;
  const canCloseSingle = visibleTabs.length > 1;
  const canCloseOthers = visibleTabs.length > 1;
  const canCloseRight = menuIndex >= 0 && menuIndex < visibleTabs.length - 1;

  return (
    <div className="tree-tabs" role="tablist" aria-label={t('treeTabs.panel')}>
      {visibleTabs.map((treeId) => {
        const isActive = treeId === activeTreeId;
        const isMain = treeId === project.mainTreeId;

        return (
          <div
            key={treeId}
            role="tab"
            aria-selected={isActive}
            className={`tree-tab${isActive ? ' active' : ''}`}
            onClick={() => setActiveTree(treeId)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuState({ treeId, x: e.clientX, y: e.clientY });
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTreeTab(treeId);
              }
            }}
          >
            <span className="tree-tab-label" title={treeId}>
              {isMain ? '★ ' : ''}
              {treeId}
            </span>
            {visibleTabs.length > 1 && (
              <button
                type="button"
                className="tree-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTreeTab(treeId);
                }}
                title={t('treeTabs.close')}
                aria-label={t('treeTabs.close')}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {menuState && (
        <div
          className="tree-tab-menu"
          style={{ left: menuState.x, top: menuState.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="tree-tab-menu-item"
            disabled={!canCloseSingle}
            onClick={() => {
              closeTreeTab(menuState.treeId);
              setMenuState(null);
            }}
          >
            {t('treeTabs.close')}
          </button>
          <button
            type="button"
            className="tree-tab-menu-item"
            disabled={!canCloseOthers}
            onClick={() => {
              closeOtherTreeTabs(menuState.treeId);
              setMenuState(null);
            }}
          >
            {t('treeTabs.closeOthers')}
          </button>
          <button
            type="button"
            className="tree-tab-menu-item"
            disabled={!canCloseRight}
            onClick={() => {
              closeTreeTabsToRight(menuState.treeId);
              setMenuState(null);
            }}
          >
            {t('treeTabs.closeToRight')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TreeTabs;

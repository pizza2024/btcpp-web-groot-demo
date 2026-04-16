import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Toolbar from '../components/Toolbar';
import NodePalette from '../components/NodePalette';
import BTCanvas from '../components/BTCanvas';
import TreeManager from '../components/TreeManager';
import { BTStoreProvider, useBTStoreApi } from '../store/BTStoreProvider';
import '../i18n';
import '../App.css';

const PropertiesPanel = React.lazy(() => import('../components/PropertiesPanel'));
const DebugPanel = React.lazy(() => import('../components/DebugPanel'));
const FavoritesPanel = React.lazy(() => import('../components/FavoritesPanel'));
const XmlPreviewPanel = React.lazy(() => import('../components/XmlPreviewPanel.tsx'));

export type BTEditorProps = {
  className?: string;
  storageKey?: string;
};

const BTEditorContent: React.FC<Pick<BTEditorProps, 'className'>> = ({ className = '' }) => {
  const { t } = useTranslation();
  const storeApi = useBTStoreApi();
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [leftTopPaneRatio, setLeftTopPaneRatio] = useState(0.42);
  const leftSidebarRef = useRef<HTMLDivElement | null>(null);
  const bothSidebarsCollapsed = leftSidebarCollapsed && rightSidebarCollapsed;

  const toggleBothSidebars = () => {
    if (bothSidebarsCollapsed) {
      setLeftSidebarCollapsed(false);
      setRightSidebarCollapsed(false);
      return;
    }

    setLeftSidebarCollapsed(true);
    setRightSidebarCollapsed(true);
  };

  useEffect(() => {
    storeApi.getState().initTheme();
  }, [storeApi]);

  useEffect(() => {
    const handlePointerUp = () => {
      document.body.classList.remove('is-resizing-panels');
    };

    window.addEventListener('mouseup', handlePointerUp);
    return () => window.removeEventListener('mouseup', handlePointerUp);
  }, []);

  const startLeftSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const sidebarElement = leftSidebarRef.current;
    if (!sidebarElement) return;

    const bounds = sidebarElement.getBoundingClientRect();
    const dividerHeight = 8;
    const minPaneHeight = 120;
    const totalHeight = bounds.height;
    const minRatio = minPaneHeight / totalHeight;
    const maxRatio = (totalHeight - minPaneHeight - dividerHeight) / totalHeight;

    document.body.classList.add('is-resizing-panels');

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const nextOffset = moveEvent.clientY - bounds.top;
      const nextRatio = nextOffset / totalHeight;
      const clampedRatio = Math.min(maxRatio, Math.max(minRatio, nextRatio));
      setLeftTopPaneRatio(clampedRatio);
    };

    const handlePointerUp = () => {
      document.body.classList.remove('is-resizing-panels');
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  return (
    <div className={`app-layout ${className}`.trim()}>
      <Toolbar />
      <div className="main-area">
        <div className={`left-sidebar-area${leftSidebarCollapsed ? ' collapsed' : ''}`}>
          <div className="left-sidebar" ref={leftSidebarRef}>
            <div className="left-sidebar-split">
              <div
                className="left-sidebar-pane top"
                style={{ flexBasis: `${leftTopPaneRatio * 100}%` }}
              >
                <TreeManager />
              </div>
              <div
                className="left-sidebar-divider"
                onMouseDown={startLeftSidebarResize}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize left sidebar panels"
              >
                <span className="left-sidebar-divider-handle" />
              </div>
              <div className="left-sidebar-pane bottom">
                <NodePalette />
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle-strip"
            onClick={() => setLeftSidebarCollapsed((value) => !value)}
            title={leftSidebarCollapsed ? t('layout.expandLeftSidebar') : t('layout.collapseLeftSidebar')}
            aria-label={leftSidebarCollapsed ? t('layout.expandLeftSidebar') : t('layout.collapseLeftSidebar')}
          >
            {leftSidebarCollapsed ? '>' : '<'}
          </button>
        </div>

        <div className="canvas-area">
          <BTCanvas
            sidePanelsCollapsed={bothSidebarsCollapsed}
            onToggleSidePanels={toggleBothSidebars}
            toggleSidePanelsLabel={bothSidebarsCollapsed ? t('layout.expandSidebars') : t('layout.collapseSidebars')}
          />
          <Suspense fallback={null}>
            <FavoritesPanel />
          </Suspense>
        </div>

        <div className={`right-sidebar-area${rightSidebarCollapsed ? ' collapsed' : ''}`}>
          <button
            type="button"
            className="sidebar-toggle-strip"
            onClick={() => setRightSidebarCollapsed((value) => !value)}
            title={rightSidebarCollapsed ? t('layout.expandRightSidebar') : t('layout.collapseRightSidebar')}
            aria-label={rightSidebarCollapsed ? t('layout.expandRightSidebar') : t('layout.collapseRightSidebar')}
          >
            {rightSidebarCollapsed ? '<' : '>'}
          </button>
          <div className="right-sidebar">
            <Suspense fallback={null}>
              <PropertiesPanel />
            </Suspense>
            <Suspense fallback={null}>
              <DebugPanel />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <XmlPreviewPanel />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

const BTEditor: React.FC<BTEditorProps> = ({ className = '', storageKey }) => {
  return (
    <BTStoreProvider storageKey={storageKey}>
      <BTEditorContent className={className} />
    </BTStoreProvider>
  );
};

export default BTEditor;
import React, { useEffect, Suspense } from 'react';
import Toolbar from './components/Toolbar';
import NodePalette from './components/NodePalette';
import BTCanvas from './components/BTCanvas';
import TreeManager from './components/TreeManager';
import { useBTStore } from './store/btStore';
import './App.css';

// Code-split helper panels (loaded asynchronously)
const PropertiesPanel = React.lazy(() => import('./components/PropertiesPanel'));
const DebugPanel = React.lazy(() => import('./components/DebugPanel'));
const FavoritesPanel = React.lazy(() => import('./components/FavoritesPanel'));

const App: React.FC = () => {
  useEffect(() => {
    useBTStore.getState().initTheme();
  }, []);

  return (
    <div className="app-layout">
      <Toolbar />
      <div className="main-area">
        {/* Left sidebar */}
        <div className="left-sidebar">
          <NodePalette />
          <TreeManager />
        </div>

        {/* Canvas */}
        <div className="canvas-area">
          <BTCanvas />
          <Suspense fallback={null}>
            <FavoritesPanel />
          </Suspense>
        </div>

        {/* Right sidebar */}
        <div className="right-sidebar">
          <Suspense fallback={null}>
            <PropertiesPanel />
          </Suspense>
          <Suspense fallback={null}>
            <DebugPanel />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default App;

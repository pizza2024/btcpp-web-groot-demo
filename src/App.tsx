import React from 'react';
import Toolbar from './components/Toolbar';
import NodePalette from './components/NodePalette';
import BTCanvas from './components/BTCanvas';
import TreeManager from './components/TreeManager';
import PropertiesPanel from './components/PropertiesPanel';
import DebugPanel from './components/DebugPanel';
import './App.css';

const App: React.FC = () => {
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
        </div>

        {/* Right sidebar */}
        <div className="right-sidebar">
          <PropertiesPanel />
          <DebugPanel />
        </div>
      </div>
    </div>
  );
};

export default App;

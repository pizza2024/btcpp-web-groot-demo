import React, { useRef, useEffect } from 'react';
import { useBTStore } from '../store/btStore';
import { SAMPLE_XML } from '../utils/btXml';

const Toolbar: React.FC = () => {
  const { loadXML, exportXML, project, activeTreeId, theme, toggleTheme } = useBTStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+S: Export XML
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.mainTreeId]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const xml = ev.target?.result as string;
      loadXML(xml);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const xml = exportXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.mainTreeId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    window.dispatchEvent(new CustomEvent('bt-export-png'));
  };

  const handleLoadSample = () => {
    loadXML(SAMPLE_XML);
  };

  return (
    <div className="toolbar">
      {/* Logo */}
      <div className="toolbar-logo">
        <span style={{ color: '#4a80d0' }}>🌳</span> BT Editor
      </div>

      <div className="toolbar-divider" />

      {/* File operations */}
      <button className="toolbar-btn" onClick={handleLoadSample} title="Load sample BT">
        📂 Sample
      </button>
      <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import BT.CPP XML">
        ⬆ Import XML
      </button>
      <button className="toolbar-btn" onClick={handleExport} title="Export BT.CPP XML">
        ⬇ Export XML
      </button>
      <button className="toolbar-btn" onClick={handleExportPNG} title="Export Behavior Tree as PNG image">
        🖼️ Export PNG
      </button>
      {/* Keyboard shortcuts help */}
      <button
        className="toolbar-btn"
        onClick={() => window.dispatchEvent(new CustomEvent('bt-toggle-shortcuts-help'))}
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>
      <input ref={fileInputRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={handleImport} />

      <div className="toolbar-divider" />

      {/* Active tree info */}
      <div style={{ fontSize: 12, color: '#8899bb' }}>
        Tree: <span style={{ color: '#c8e0ff', fontWeight: 600 }}>{activeTreeId}</span>
        {activeTreeId === project.mainTreeId && (
          <span style={{ color: '#f0a020', marginLeft: 6 }}>★ main</span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        className="toolbar-btn"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{ minWidth: 70 }}
      >
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>

      {/* Help */}
      <div style={{ fontSize: 11, color: '#445', textAlign: 'right' }}>
        Drag nodes from palette → canvas · Connect nodes · Double-click to rename
      </div>
    </div>
  );
};

export default Toolbar;

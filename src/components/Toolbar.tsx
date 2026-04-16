import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import { SAMPLE_XML, analyzeMissingNodeModels, type MissingNodeModelCandidate } from '../utils/btXml';
import MissingNodeModelsImporterModal from './MissingNodeModelsImporterModal';

function isProjectModeSwitchLocked(project: { trees: Array<{ root: { children: unknown[] } }>; mainTreeId: string }): boolean {
  return project.trees.some((tree) => tree.root.children.length > 0);
}

const Toolbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // Separate selectors for each value to maintain proper reactivity
  // Use arrow functions to ensure they return the same reference for same values
  const loadXML = useBTStore((state) => state.loadXML);
  const exportXML = useBTStore((state) => state.exportXML);
  const setExportFormat = useBTStore((state) => state.setExportFormat);
  const toggleTheme = useBTStore((state) => state.toggleTheme);
  const project = useBTStore((state) => state.project);
  const activeTreeId = useBTStore((state) => state.activeTreeId);
  const theme = useBTStore((state) => state.theme);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingModelCandidates, setMissingModelCandidates] = useState<MissingNodeModelCandidate[]>([]);
  
  // Extract xmlFormat from the latest project state
  const xmlFormat: 3 | 4 = project.exportFormat ?? 4;
  const formatSwitchLocked = isProjectModeSwitchLocked(project);

  // Debug: Log whenever the project changes
  useEffect(() => {
    console.log('=== Toolbar: project object changed ===');
    console.log('project.exportFormat:', project.exportFormat);
    console.log('xmlFormat:', xmlFormat);
  }, [project]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('bt-language', newLang);
  };

  const handleExport = useCallback(() => {
    const xml = exportXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${project.mainTreeId}.xml`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }, [exportXML, project.mainTreeId]);

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
  }, [handleExport]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const xml = ev.target?.result as string;
      let candidates: MissingNodeModelCandidate[] = [];
      try {
        candidates = analyzeMissingNodeModels(xml);
      } catch {
        candidates = [];
      }
      console.log('=== About to load XML ===');
      console.log('XML content preview:', xml.substring(0, 300));
      const importedProject = loadXML(xml);
      if (importedProject) {
        console.log('=== Import completed ===');
        console.log('importedProject.exportFormat:', importedProject.exportFormat);
        console.log('project in store:', project);
      }
      if (!importedProject) return;
      setMissingModelCandidates(candidates);
    };
    reader.readAsText(file);
    e.target.value = '';
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
      <button className="toolbar-btn" onClick={handleLoadSample} title={t('toolbar.sample')}>
        📂 {t('toolbar.sample')}
      </button>
      <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title={t('toolbar.importXml')}>
        ⬆ {t('toolbar.importXml')}
      </button>
      <button className="toolbar-btn" onClick={handleExport} title={t('toolbar.exportXml')}>
        ⬇ {t('toolbar.exportXml')}
      </button>
      {/* XML Format selector */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginLeft: '12px', paddingRight: '8px', backgroundColor: '#1e2535', borderRadius: '4px', padding: '4px 8px' }}>
        <span style={{ fontSize: '12px', color: '#8899bb', marginRight: '4px', fontWeight: 500 }}>
          {t('toolbar.xmlFormat')}
        </span>
        <button
          onClick={() => {
            console.log('Clicked V3, current xmlFormat:', xmlFormat);
            setExportFormat(3);
          }}
          disabled={formatSwitchLocked}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: xmlFormat === 3 ? 600 : 400,
            backgroundColor: xmlFormat === 3 ? '#4a80d0' : '#2a3f5f',
            color: xmlFormat === 3 ? '#ffffff' : '#8899bb',
            border: xmlFormat === 3 ? '1px solid #6ba3ff' : '1px solid #3a5f8f',
            borderRadius: '3px',
            cursor: formatSwitchLocked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: formatSwitchLocked ? 0.5 : 1,
          }}
          title={formatSwitchLocked ? t('toolbar.formatLockedHint') : 'Select BehaviorTree.CPP v3 format'}
        >
          v3
        </button>
        <button
          onClick={() => {
            console.log('Clicked V4, current xmlFormat:', xmlFormat);
            setExportFormat(4);
          }}
          disabled={formatSwitchLocked}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: xmlFormat === 4 ? 600 : 400,
            backgroundColor: xmlFormat === 4 ? '#4a80d0' : '#2a3f5f',
            color: xmlFormat === 4 ? '#ffffff' : '#8899bb',
            border: xmlFormat === 4 ? '1px solid #6ba3ff' : '1px solid #3a5f8f',
            borderRadius: '3px',
            cursor: formatSwitchLocked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: formatSwitchLocked ? 0.5 : 1,
          }}
          title={formatSwitchLocked ? t('toolbar.formatLockedHint') : 'Select BehaviorTree.CPP v4 format'}
        >
          v4
        </button>
      </div>
      <button className="toolbar-btn" onClick={handleExportPNG} title={t('toolbar.exportPng')}>
        🖼️ {t('toolbar.exportPng')}
      </button>
      {/* Keyboard shortcuts help */}
      <button
        className="toolbar-btn"
        onClick={() => window.dispatchEvent(new CustomEvent('bt-toggle-shortcuts-help'))}
        title={t('toolbar.help')}
      >
        ?
      </button>
      <input ref={fileInputRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={handleImport} />

      <div className="toolbar-divider" />

      {/* Active tree info */}
      <div style={{ fontSize: 12, color: '#8899bb' }}>
        {t('canvas.treeLabel')}: <span style={{ color: '#c8e0ff', fontWeight: 600 }}>{activeTreeId}</span>
        {activeTreeId === project.mainTreeId && (
          <span style={{ color: '#f0a020', marginLeft: 6 }}>★ {t('canvas.mainTree')}</span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Language toggle */}
      <button
        className="toolbar-btn"
        onClick={toggleLanguage}
        title={t('language.switch')}
        style={{ minWidth: 60 }}
      >
        {i18n.language === 'en' ? '🇺🇸 EN' : '🇨🇳 中文'}
      </button>

      {/* Theme toggle */}
      <button
        className="toolbar-btn"
        onClick={toggleTheme}
        title={t('toolbar.theme')}
        style={{ minWidth: 70 }}
      >
        {theme === 'dark' ? '🌙 ' + t('toolbar.dark') : '☀️ ' + t('toolbar.light')}
      </button>

      {/* Help */}
      <div style={{ fontSize: 11, color: '#445', textAlign: 'right' }}>
        {t('canvas.dragHint')}
      </div>

      {missingModelCandidates.length > 0 && (
        <MissingNodeModelsImporterModal
          candidates={missingModelCandidates}
          onClose={() => setMissingModelCandidates([])}
        />
      )}
    </div>
  );
};

export default Toolbar;

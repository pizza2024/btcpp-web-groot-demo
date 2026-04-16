import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import { SAMPLE_XML, analyzeMissingNodeModels, type MissingNodeModelCandidate } from '../utils/btXml';
import MissingNodeModelsImporterModal from './MissingNodeModelsImporterModal';

function isProjectModeSwitchLocked(project: { trees: Array<{ root: { children: unknown[] } }>; mainTreeId: string }): boolean {
  return project.trees.some((tree) => tree.root.children.length > 0);
}

const Toolbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { loadXML, exportXML, project, activeTreeId, theme, toggleTheme, setExportFormat } = useBTStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingModelCandidates, setMissingModelCandidates] = useState<MissingNodeModelCandidate[]>([]);
  const [xmlFormat, setXmlFormat] = useState<3 | 4>(project.exportFormat ?? 4);
  const formatSwitchLocked = isProjectModeSwitchLocked(project);

  useEffect(() => {
    setXmlFormat(project.exportFormat ?? 4);
  }, [project.exportFormat]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('bt-language', newLang);
  };

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
      let candidates: MissingNodeModelCandidate[] = [];
      try {
        candidates = analyzeMissingNodeModels(xml);
      } catch {
        candidates = [];
      }
      const importedProject = loadXML(xml);
      if (!importedProject) return;
      setMissingModelCandidates(candidates);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const xml = exportXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${project.mainTreeId}.xml`;
    a.click();
    URL.revokeObjectURL(blobUrl);
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
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '8px', paddingRight: '8px' }}>
        <label style={{ fontSize: '12px', color: '#8899bb', minWidth: '40px' }}>
          {t('toolbar.xmlFormat')}:
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="xml-format"
            value="3"
            checked={xmlFormat === 3}
            disabled={formatSwitchLocked}
            onChange={(e) => {
              const fmt = parseInt(e.target.value) as 3 | 4;
              setXmlFormat(fmt);
              setExportFormat(fmt);
            }}
            style={{ margin: 0 }}
          />
          <span style={{ fontSize: '12px' }}>{t('toolbar.xmlFormatV3')}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="xml-format"
            value="4"
            checked={xmlFormat === 4}
            disabled={formatSwitchLocked}
            onChange={(e) => {
              const fmt = parseInt(e.target.value) as 3 | 4;
              setXmlFormat(fmt);
              setExportFormat(fmt);
            }}
            style={{ margin: 0 }}
          />
          <span style={{ fontSize: '12px' }}>{t('toolbar.xmlFormatV4')}</span>
        </label>
      </div>
      {formatSwitchLocked && (
        <div style={{ fontSize: '11px', color: '#8899bb', paddingRight: '8px' }} title={t('toolbar.formatLockedHint')}>
          {t('toolbar.formatLocked')}
        </div>
      )}
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

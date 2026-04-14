import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import { serializeXML } from '../utils/btXml';

const XML_PANEL_MIN_WIDTH = 240;
const XML_PANEL_MAX_WIDTH = 560;

function formatXmlForPreview(source: string): string {
  if (!source.trim()) return source;

  const normalized = source
    .replace(/>\s+</g, '><')
    .replace(/(>)(<)(\/?)/g, '$1\n$2$3');

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  let indent = 0;

  return lines
    .map((line) => {
      if (/^<\//.test(line)) {
        indent = Math.max(0, indent - 1);
      }

      const formatted = `${'  '.repeat(indent)}${line}`;

      if (/^<[^!?/][^>]*[^/]?>$/.test(line) && !line.includes('</')) {
        indent += 1;
      }

      return formatted;
    })
    .join('\n');
}

const XmlPreviewPanel: React.FC = () => {
  const { t } = useTranslation();
  const project = useBTStore((state) => state.project);
  const activeTreeId = useBTStore((state) => state.activeTreeId);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState(320);
  const [resizing, setResizing] = useState(false);
  const copyResetRef = useRef<number | null>(null);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const xml = useMemo(() => serializeXML(project), [project]);
  const formattedXml = useMemo(() => formatXmlForPreview(xml), [xml]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }

      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  const handleResizeMove = (event: MouseEvent) => {
    if (!resizeStateRef.current) return;
    const delta = resizeStateRef.current.startX - event.clientX;
    const nextWidth = Math.min(
      XML_PANEL_MAX_WIDTH,
      Math.max(XML_PANEL_MIN_WIDTH, resizeStateRef.current.startWidth + delta)
    );
    setWidth(nextWidth);
  };

  const handleResizeEnd = () => {
    resizeStateRef.current = null;
    setResizing(false);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = { startX: event.clientX, startWidth: width };
    setResizing(true);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const handleToggle = () => {
    setCollapsed((value) => !value);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => {
        setCopied(false);
        copyResetRef.current = null;
      }, 1200);
    } catch {
      window.alert(t('xmlPreview.copyFailed'));
    }
  };

  if (collapsed) {
    return (
      <aside className="xml-preview-sidebar collapsed" aria-label={t('xmlPreview.title')}>
        <button
          type="button"
          className="xml-preview-collapsed-toggle"
          onClick={handleToggle}
          title={t('xmlPreview.expand')}
          aria-label={t('xmlPreview.expand')}
        >
          <span>{'<'}</span>
          <span className="xml-preview-collapsed-label">XML</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`xml-preview-sidebar${resizing ? ' resizing' : ''}`}
      aria-label={t('xmlPreview.title')}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div
        className="xml-preview-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('xmlPreview.resize')}
        onMouseDown={handleResizeStart}
        title={t('xmlPreview.resize')}
      />
      <div className="xml-preview-header">
        <div className="xml-preview-title-wrap">
          <div className="xml-preview-title">{t('xmlPreview.title')}</div>
          <div className="xml-preview-subtitle">{t('xmlPreview.description')}</div>
        </div>
        <div className="xml-preview-actions">
          <button
            type="button"
            className="xml-preview-icon-btn"
            onClick={handleCopy}
            title={t('xmlPreview.copy')}
            aria-label={t('xmlPreview.copy')}
          >
            {copied ? t('xmlPreview.copied') : t('xmlPreview.copy')}
          </button>
          <button
            type="button"
            className="xml-preview-icon-btn"
            onClick={handleToggle}
            title={t('xmlPreview.collapse')}
            aria-label={t('xmlPreview.collapse')}
          >
            {'>'}
          </button>
        </div>
      </div>
      <div className="xml-preview-body">
        <div className="xml-preview-meta">{t('xmlPreview.activeTree', { tree: activeTreeId })}</div>
        <pre className="xml-preview-code">{formattedXml || t('xmlPreview.empty')}</pre>
      </div>
    </aside>
  );
};

export default XmlPreviewPanel;
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import xmlFormatter from 'xml-formatter';
import { useBTStore } from '../store/BTStoreProvider';
import { serializeXML } from '../utils/btXml';

const XML_PANEL_MIN_WIDTH = 240;
const XML_PANEL_MAX_WIDTH = 560;

function formatXmlForPreview(source: string): string {
  if (!source.trim()) return source;

  try {
    return xmlFormatter(source, {
      indentation: '  ',
      lineSeparator: '\n',
      collapseContent: true,
      whiteSpaceAtEndOfSelfclosingTag: false,
    });
  } catch {
    // Fall back to original content if formatting fails.
    return source;
  }
}

const XmlPreviewPanel: React.FC = () => {
  const { t } = useTranslation();
  const project = useBTStore((state) => state.project);
  const activeTreeId = useBTStore((state) => state.activeTreeId);
  const loadXML = useBTStore((state) => state.loadXML);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedXml, setEditedXml] = useState('');
  const [width, setWidth] = useState(320);
  const [resizing, setResizing] = useState(false);
  const copyResetRef = useRef<number | null>(null);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedXml(xml);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedXml('');
  };

  const handleSaveEdit = () => {
    try {
      const newProject = loadXML(editedXml);
      if (!newProject) {
        window.alert(t('xmlPreview.invalidXml'));
        return;
      }
      setIsEditing(false);
      setEditedXml('');
    } catch (error) {
      window.alert(`${t('xmlPreview.parseError')}: ${String(error)}`);
    }
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
          {!isEditing && (
            <>
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
                onClick={handleEditClick}
                title={t('xmlPreview.edit')}
                aria-label={t('xmlPreview.edit')}
              >
                ✎
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                className="xml-preview-icon-btn xml-preview-save-btn"
                onClick={handleSaveEdit}
                title={t('xmlPreview.save')}
                aria-label={t('xmlPreview.save')}
              >
                ✔
              </button>
              <button
                type="button"
                className="xml-preview-icon-btn xml-preview-cancel-btn"
                onClick={handleCancelEdit}
                title={t('xmlPreview.cancel')}
                aria-label={t('xmlPreview.cancel')}
              >
                ✕
              </button>
            </>
          )}
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
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="xml-preview-textarea"
            value={editedXml}
            onChange={(e) => setEditedXml(e.target.value)}
            spellCheck="false"
            wrap="off"
          />
        ) : (
          <pre className="xml-preview-code">{formattedXml || t('xmlPreview.empty')}</pre>
        )}
      </div>
    </aside>
  );
};

export default XmlPreviewPanel;
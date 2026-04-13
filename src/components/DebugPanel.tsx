import React, { useRef, useState } from 'react';
import { useBTStore } from '../store/btStore';
import { STATUS_COLORS } from '../types/bt-constants';

const SAMPLE_LOG = `0 1 Sequence Root RUNNING MainTree
10 2 Condition CheckBattery RUNNING MainTree
20 2 Condition CheckBattery SUCCESS MainTree
30 3 Fallback Fallback RUNNING MainTree
40 4 Condition IsAtGoal RUNNING MainTree
50 4 Condition IsAtGoal FAILURE MainTree
60 5 Action MoveToGoal RUNNING MainTree
70 5 Action MoveToGoal SUCCESS MainTree
80 3 Fallback Fallback SUCCESS MainTree
90 6 SubTree GraspPipeline RUNNING MainTree
100 7 Sequence Sequence RUNNING GraspPipeline
110 8 Action OpenGripper RUNNING GraspPipeline
120 8 Action OpenGripper SUCCESS GraspPipeline
130 9 Action ApproachObject RUNNING GraspPipeline
140 9 Action ApproachObject SUCCESS GraspPipeline
150 10 RetryUntilSuccessful RetryUntilSuccessful RUNNING GraspPipeline
160 11 Action CloseGripper RUNNING GraspPipeline
170 11 Action CloseGripper SUCCESS GraspPipeline
180 10 RetryUntilSuccessful RetryUntilSuccessful SUCCESS GraspPipeline
190 7 Sequence Sequence SUCCESS GraspPipeline
200 6 SubTree GraspPipeline SUCCESS MainTree
210 1 Sequence Root SUCCESS MainTree`;

const DebugPanel: React.FC = () => {
  const { debugState, loadDebugLog, debugStep, debugPlay, debugReset } = useBTStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogEditor, setShowLogEditor] = useState(false);
  const [logText, setLogText] = useState(SAMPLE_LOG);

  const { active, playIndex, entries } = debugState;

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      loadDebugLog(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSample = () => {
    setLogText(SAMPLE_LOG);
    loadDebugLog(SAMPLE_LOG);
  };

  const handleLoadCustom = () => {
    loadDebugLog(logText);
    setShowLogEditor(false);
  };

  const currentEntry = active && playIndex >= 0 ? entries[playIndex] : null;

  return (
    <div className="panel debug-panel">
      <div className="panel-header">Debug / Log Replay</div>

      {/* Load controls */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        <button className="btn-secondary" onClick={handleLoadSample} title="Load built-in sample log">
          Sample Log
        </button>
        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} title="Load .log file">
          Load File
        </button>
        <button className="btn-secondary" onClick={() => setShowLogEditor((v) => !v)} title="Paste log text">
          Paste Log
        </button>
        {active && (
          <button className="btn-danger" onClick={debugReset} title="Clear debug">
            Reset
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".log,.txt,.json" style={{ display: 'none' }} onChange={handleLoadFile} />
      </div>

      {/* Paste log editor */}
      {showLogEditor && (
        <div style={{ marginBottom: 8 }}>
          <textarea
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              background: '#0f0f1e',
              border: '1px solid #334',
              color: '#aabbd0',
              borderRadius: 4,
              padding: 6,
              fontSize: 11,
              fontFamily: 'monospace',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <button className="btn-primary" onClick={handleLoadCustom} style={{ width: '100%', marginTop: 4 }}>
            Apply Log
          </button>
          <div style={{ fontSize: 10, color: '#556', marginTop: 4 }}>
            Format: text (timestamp uid nodeType name status [treeId]) or JSON array
          </div>
        </div>
      )}

      {/* Playback controls */}
      {active && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
            <button className="btn-secondary" onClick={() => debugStep('back')} disabled={playIndex <= -1}>◀</button>
            <button className="btn-primary" onClick={debugPlay}>▶ Play</button>
            <button className="btn-secondary" onClick={() => debugStep('forward')} disabled={playIndex >= entries.length - 1}>▶</button>
            <span style={{ marginLeft: 4, fontSize: 11, color: '#8899bb' }}>
              {playIndex + 1} / {entries.length}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: '#1a1a2e', borderRadius: 4, height: 6, marginBottom: 8, overflow: 'hidden' }}>
            <div
              style={{
                background: '#4a80d0',
                height: '100%',
                width: `${entries.length > 0 ? ((playIndex + 1) / entries.length) * 100 : 0}%`,
                transition: 'width 0.2s',
              }}
            />
          </div>

          {/* Current entry info */}
          {currentEntry && (
            <div style={{
              background: '#1a1a2e',
              border: `1px solid ${STATUS_COLORS[currentEntry.status]}`,
              borderRadius: 4,
              padding: '6px 8px',
              fontSize: 11,
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#8899bb' }}>t={currentEntry.timestamp}ms</span>
                <span style={{ color: STATUS_COLORS[currentEntry.status], fontWeight: 700 }}>
                  {currentEntry.status}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: '#ccd' }}>
                {currentEntry.nodeType} <span style={{ opacity: 0.7 }}>"{currentEntry.nodeName}"</span>
              </div>
              <div style={{ fontSize: 10, color: '#667' }}>tree: {currentEntry.treeId}</div>
            </div>
          )}

          {/* Log entries list */}
          <div style={{
            maxHeight: 150,
            overflowY: 'auto',
            fontSize: 10,
            fontFamily: 'monospace',
            background: '#0f0f1e',
            borderRadius: 4,
            padding: 4,
          }}>
            {entries.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: '1px 4px',
                  background: i === playIndex ? '#1e2a3e' : 'transparent',
                  color: i <= playIndex ? '#aabbd0' : '#445',
                  cursor: 'default',
                  borderLeft: i === playIndex ? '2px solid #4a80d0' : '2px solid transparent',
                }}
              >
                <span style={{ color: '#556' }}>{e.timestamp}ms </span>
                <span>{e.nodeType} </span>
                <span style={{ opacity: 0.7 }}>"{e.nodeName}" </span>
                <span style={{ color: STATUS_COLORS[e.status] }}>{e.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!active && (
        <div style={{ color: '#445', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
          No debug log loaded.<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>Load a log file or use the sample to replay a BT execution.</span>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;

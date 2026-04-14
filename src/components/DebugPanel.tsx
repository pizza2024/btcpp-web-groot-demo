import React, { useRef, useState } from 'react';
import { useBTStore } from '../store/BTStoreProvider';
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
120 8 Action OpenGripper SUCCESS MainTree
130 9 Action ApproachObject RUNNING GraspPipeline
140 9 Action ApproachObject SUCCESS GraspPipeline
150 10 RetryUntilSuccessful RetryUntilSuccessful RUNNING GraspPipeline
160 11 Action CloseGripper RUNNING GraspPipeline
170 11 Action CloseGripper SUCCESS GraspPipeline
180 10 RetryUntilSuccessful RetryUntilSuccessful SUCCESS GraspPipeline
190 7 Sequence Sequence SUCCESS GraspPipeline
200 6 SubTree GraspPipeline SUCCESS MainTree
210 1 Sequence Root SUCCESS MainTree`;

// ─── Groot2 Connection Section ───────────────────────────────────────────────

const Groot2ConnectionPanel: React.FC = () => {
  const {
    groot2State,
    connectGroot2,
    disconnectGroot2,
  } = useBTStore();

  const [bridgeUrl, setBridgeUrl] = useState(groot2State.bridgeUrl);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnectError(null);
    setConnecting(true);
    try {
      await connectGroot2(bridgeUrl);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGroot2();
    setConnectError(null);
  };

  const { connected, error } = groot2State;

  return (
    <div style={{
      background: '#0f0f1e',
      border: '1px solid #223',
      borderRadius: 6,
      padding: 10,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8899bb', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Live Debug
        </span>
        {/* Status dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? '#4caf50' : connecting ? '#ff9800' : '#556',
          boxShadow: connected ? '0 0 6px #4caf50' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 10, color: connected ? '#4caf50' : '#556' }}>
          {connected ? `Connected${groot2State.treeId ? ` (tree: ${groot2State.treeId})` : ''}` :
           connecting ? 'Connecting...' : 'Disconnected'}
        </span>
      </div>

      {/* Bridge URL input */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <input
          type="text"
          value={bridgeUrl}
          onChange={(e) => setBridgeUrl(e.target.value)}
          placeholder="ws://localhost:8080"
          disabled={connected || connecting}
          style={{
            flex: 1,
            background: '#1a1a2e',
            border: '1px solid #334',
            borderRadius: 4,
            color: '#aabbd0',
            padding: '4px 8px',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        />
        {connected ? (
          <button
            className="btn-danger"
            onClick={handleDisconnect}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Disconnect
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleConnect}
            disabled={connecting || !bridgeUrl}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            {connecting ? '...' : 'Connect'}
          </button>
        )}
      </div>

      {/* Error display */}
      {(connectError || error) && (
        <div style={{
          fontSize: 10,
          color: '#ef5350',
          background: '#1a0a0a',
          border: '1px solid #3d1515',
          borderRadius: 4,
          padding: '4px 8px',
        }}>
          {connectError || error}
        </div>
      )}

      {/* Info about what this does */}
      {!connected && !connecting && (
        <div style={{ fontSize: 10, color: '#556', marginTop: 4 }}>
          Connect to a running BT.CPP runtime via the Groot2 bridge service.
          Requires <code style={{ color: '#7a9ccc' }}>npm run dev</code> in{' '}
          <code style={{ color: '#7a9ccc' }}>packages/btcpp-groot2-bridge/</code>.
        </div>
      )}

      {/* Live statuses preview */}
      {connected && groot2State.liveStatuses.size > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, color: '#556', marginBottom: 4 }}>
            Live node statuses ({groot2State.liveStatuses.size} nodes):
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            maxHeight: 60,
            overflowY: 'auto',
          }}>
            {Array.from(groot2State.liveStatuses.entries()).slice(0, 20).map(([uid, status]) => (
              <span key={uid} style={{
                fontSize: 10,
                fontFamily: 'monospace',
                padding: '1px 5px',
                borderRadius: 3,
                background: '#1a1a2e',
                color: STATUS_COLORS[status] ?? '#8899bb',
                border: `1px solid ${STATUS_COLORS[status] ?? '#334'}33`,
              }}>
                {uid}: {status}
              </span>
            ))}
            {groot2State.liveStatuses.size > 20 && (
              <span style={{ fontSize: 10, color: '#556' }}>+{groot2State.liveStatuses.size - 20} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Log Replay Section ─────────────────────────────────────────────────────

const LogReplayPanel: React.FC = () => {
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
    <>
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
          No log loaded. Use a sample log or load a .log file.
        </div>
      )}
    </>
  );
};

// ─── Main Panel ─────────────────────────────────────────────────────────────

const DebugPanel: React.FC = () => {
  return (
    <div className="panel debug-panel">
      <div className="panel-header">Debug</div>

      {/* Groot2 Live Connection */}
      <Groot2ConnectionPanel />

      <div style={{
        borderTop: '1px solid #1e1e30',
        paddingTop: 10,
        marginTop: 4,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8899bb', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Log Replay
        </div>
        <LogReplayPanel />
      </div>
    </div>
  );
};

export default DebugPanel;

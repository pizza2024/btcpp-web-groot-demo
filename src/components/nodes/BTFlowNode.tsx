import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { STATUS_COLORS, BUILTIN_NODES } from '../../types/bt-constants';

interface BTNodeData {
  label: string;
  nodeType: string;
  category: string;
  colors: { bg: string; border: string; text: string };
  ports: Record<string, string>;
  preconditions?: Record<string, string>;
  postconditions?: Record<string, string>;
  description?: string;
  status?: string;
  childrenCount: number;
  isRoot?: boolean;
  [key: string]: unknown;
}

const BTFlowNode: React.FC<NodeProps> = ({ data, selected, id: nodeId }) => {
  const d = data as BTNodeData;
  const { label, category, colors, ports, preconditions, postconditions, description, status, isRoot } = d;

  const statusColor = status ? STATUS_COLORS[status] : undefined;
  const borderColor = statusColor ?? (selected ? '#ffffff' : colors.border);
  const borderWidth = selected ? 2 : 1.5;

  const isLeaf = category === 'Action' || category === 'Condition';
  const isRootNode = isRoot === true;

  // Look up port definitions for this node type
  const nodeDef = BUILTIN_NODES.find(n => n.type === d.nodeType);

  // Group port entries by direction
  const portEntries = ports ? Object.entries(ports).filter(([, v]) => v !== '') : [];

  // Build port groups
  const inputPorts: Array<[string, string]> = [];
  const outputPorts: Array<[string, string]> = [];
  const otherPorts: Array<[string, string]> = [];

  portEntries.forEach(([k, v]) => {
    const def = nodeDef?.ports?.find(p => p.name === k);
    if (def?.direction === 'input') {
      inputPorts.push([k, v]);
    } else if (def?.direction === 'output') {
      outputPorts.push([k, v]);
    } else {
      otherPorts.push([k, v]);
    }
  });

  // Check for pre/post conditions
  const hasPre = preconditions && Object.values(preconditions).some(v => v);
  const hasPost = postconditions && Object.values(postconditions).some(v => v);

  // Double click opens edit modal (disabled for ROOT)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isRootNode) return;
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('bt-node-edit', {
      detail: { nodeId }
    }));
  };

  // Calculate handle positions based on node category
  // ROOT: only output (source) handle at bottom
  // Leaf (Action/Condition): only input (target) handle at top
  // Control/Decorator/SubTree: both input and output handles
  const handles: React.ReactNode[] = [];

  // Target handle (input) - for all non-ROOT nodes
  if (!isRootNode) {
    handles.push(
      <Handle
        key="target"
        type="target"
        position={Position.Top}
        style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
      />
    );
  }

  // Source handle (output) - only for nodes that can have children
  // ROOT, Control, Decorator, SubTree can have children (except leaf nodes)
  if (!isLeaf) {
    handles.push(
      <Handle
        key="source"
        type="source"
        position={Position.Bottom}
        style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
      />
    );
  }

  // ROOT node: render as a thin visual container bar
  if (isRootNode) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        style={{
          background: colors.bg,
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: 6,
          padding: '4px 20px',
          minWidth: 120,
          color: colors.text,
          fontFamily: 'monospace',
          fontSize: 11,
          textAlign: 'center',
          boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.3)' : '0 2px 8px rgba(0,0,0,0.5)',
          userSelect: 'none',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {handles}
        <span style={{ fontWeight: 700, letterSpacing: '0.1em', opacity: 0.9 }}>ROOT</span>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        background: colors.bg,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: 6,
        padding: '6px 10px',
        minWidth: 140,
        maxWidth: 200,
        color: colors.text,
        fontFamily: 'monospace',
        fontSize: 12,
        textAlign: 'center',
        boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.3)' : '0 2px 8px rgba(0,0,0,0.5)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        userSelect: 'none',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {handles}

      {/* Category badge */}
      <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {isLeaf ? 'Action' : category}
      </div>

      {/* Label */}
      <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word' }}>
        {label}
      </div>

      {/* Ports summary */}
      {portEntries.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 10, opacity: 0.8 }}>
          {inputPorts.length > 0 && (
            <div style={{ marginBottom: 2 }}>
              <span style={{ fontSize: 8, opacity: 0.5, textTransform: 'uppercase', marginRight: 4 }}>IN</span>
              {inputPorts.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, paddingLeft: 8 }}>
                  <span style={{ opacity: 0.7 }}>{k}:</span>
                  <span style={{ color: '#ffe080' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {outputPorts.length > 0 && (
            <div style={{ marginBottom: 2 }}>
              <span style={{ fontSize: 8, opacity: 0.5, textTransform: 'uppercase', marginRight: 4 }}>OUT</span>
              {outputPorts.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, paddingLeft: 8 }}>
                  <span style={{ opacity: 0.7 }}>{k}:</span>
                  <span style={{ color: '#ffe080' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {otherPorts.length > 0 && (
            <div>
              {otherPorts.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ opacity: 0.7 }}>{k}:</span>
                  <span style={{ color: '#ffe080' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pre/Post condition indicators */}
      {(hasPre || hasPost || description) && (
        <div style={{ marginTop: 3, fontSize: 8, opacity: 0.6 }}>
          {hasPre && <span title="Has pre-conditions">⏱</span>}
          {hasPost && <span title="Has post-conditions">↩</span>}
          {description && <span title={description}>📝</span>}
        </div>
      )}

      {/* Status indicator */}
      {status && status !== 'IDLE' && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: statusColor,
            borderRadius: '50%',
            width: 14,
            height: 14,
            border: '2px solid #1a1a2e',
          }}
        />
      )}
    </div>
  );
};

export default BTFlowNode;

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { STATUS_COLORS } from '../../types/bt-constants';
import type { NodeStatus } from '../../types/bt';

export interface BTNodeData {
  label: string;
  nodeType: string;
  category: string;
  colors: { bg: string; border: string; text: string };
  ports?: Record<string, string>;
  childIndex?: number;
  status?: NodeStatus;
  selected?: boolean;
  [key: string]: unknown;
}

const BTFlowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as BTNodeData;
  const { label, category, colors, ports, status } = d;

  const statusColor = status ? STATUS_COLORS[status] : undefined;
  const borderColor = statusColor ?? (selected ? '#ffffff' : colors.border);
  const borderWidth = selected ? 2 : 1.5;

  const isDecorator = category === 'Decorator';
  const isSubTree = category === 'SubTree';

  // Show port values if any
  const portEntries = ports ? Object.entries(ports).filter(([, v]) => v !== '') : [];

  return (
    <div
      style={{
        background: colors.bg,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: isDecorator ? '50%' : isSubTree ? '10px' : '6px',
        padding: isDecorator ? '10px 14px' : '6px 10px',
        minWidth: isDecorator ? 90 : 140,
        maxWidth: 200,
        color: colors.text,
        fontFamily: 'monospace',
        fontSize: 12,
        textAlign: 'center',
        boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.3)' : '0 2px 8px rgba(0,0,0,0.5)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        userSelect: 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
      />

      {/* Node type badge — show category for all except leaf (where type IS the name) */}
      <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {category === 'Leaf' ? 'Action' : category}
      </div>

      {/* Label */}
      <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word' }}>
        {label}
      </div>

      {/* Ports summary */}
      {portEntries.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 10, opacity: 0.8 }}>
          {portEntries.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
              <span style={{ opacity: 0.7 }}>{k}:</span>
              <span style={{ color: '#ffe080' }}>{v}</span>
            </div>
          ))}
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

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
};

export default BTFlowNode;

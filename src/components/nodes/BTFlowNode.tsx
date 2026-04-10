import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { STATUS_COLORS } from '../../types/bt-constants';

interface BTNodeData {
  label: string;
  nodeType: string;
  category: string;
  colors: { bg: string; border: string; text: string };
  ports: Record<string, string>;
  status?: string;
  childrenCount: number;
  [key: string]: unknown;
}

const BTFlowNode: React.FC<NodeProps> = ({ data, selected, id: nodeId }) => {
  const d = data as BTNodeData;
  const { label, category, colors, ports, status, childrenCount } = d;

  const statusColor = status ? STATUS_COLORS[status] : undefined;
  const borderColor = statusColor ?? (selected ? '#ffffff' : colors.border);
  const borderWidth = selected ? 2 : 1.5;

  const isDecorator = category === 'Decorator';
  const isSubTree = category === 'SubTree';
  const isLeaf = category === 'Leaf';

  // Port values display
  const portEntries = ports ? Object.entries(ports).filter(([, v]) => v !== '') : [];

  // Double click opens edit modal
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('bt-node-edit', {
      detail: { nodeId }
    }));
  };

  // Calculate handle positions for multi-children nodes
  const handles: React.ReactNode[] = [];

  // Target handle (for incoming edge) - always at top
  handles.push(
    <Handle
      key="target"
      type="target"
      position={Position.Top}
      style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
    />
  );

  // Source handles - one per child, or one default
  const actualChildrenCount = typeof childrenCount === 'number' ? childrenCount : 0;
  if (actualChildrenCount > 1) {
    // Multiple children: distribute handles evenly along bottom
    for (let i = 0; i < actualChildrenCount; i++) {
      const leftPercent = ((i + 1) / (actualChildrenCount + 1)) * 100;
      handles.push(
        <Handle
          key={`source-${i}`}
          type="source"
          position={Position.Bottom}
          style={{
            left: `${leftPercent}%`,
            background: '#6888aa',
            border: 'none',
            width: 8,
            height: 8,
          }}
        />
      );
    }
  } else {
    // Single or no child: single handle at bottom center
    handles.push(
      <Handle
        key="source"
        type="source"
        position={Position.Bottom}
        style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
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
    </div>
  );
};

export default BTFlowNode;

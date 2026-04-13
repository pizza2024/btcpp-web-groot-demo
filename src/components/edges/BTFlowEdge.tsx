import React from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export interface BTFlowEdgeData {
  onDelete?: (edgeId: string) => void;
  /** Source port name (for type validation display) */
  sourcePort?: string;
  /** Target port name */
  targetPort?: string;
  /** Type mismatch warning message, if any */
  typeWarning?: string;
  /** Whether this connection is invalid (e.g., leaf→any) */
  invalid?: boolean;
  /** Target node debug status ('IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'HALTED') */
  targetStatus?: string;
}

const BTFlowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}) => {
  const edgeData = data as BTFlowEdgeData | undefined;
  const hasWarning = !!edgeData?.typeWarning;
  const isInvalid = !!edgeData?.invalid;
  const isRunning = edgeData?.targetStatus === 'RUNNING';

  // Determine edge styling based on state
  const strokeColor = isInvalid ? '#e04040' : hasWarning ? '#f0a020' : '#6888aa';
  const strokeWidth = isInvalid || hasWarning ? 2.5 : 2;

  const [edgePath] = getSmoothStepPath({
    sourceX: sourceX ?? 0,
    sourceY: sourceY ?? 0,
    sourcePosition: sourcePosition ?? 0,
    targetX: targetX ?? 0,
    targetY: targetY ?? 0,
    targetPosition: targetPosition ?? 0,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edgeData?.onDelete) {
      edgeData.onDelete(id);
    }
  };

  // Midpoint for buttons and warning label
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, stroke: strokeColor, strokeWidth }}
        className={`react-flow__edge bt-flow-edge${hasWarning ? ' bt-edge-warning' : ''}${isInvalid ? ' bt-edge-invalid' : ''}${isRunning ? ' bt-edge-running' : ''}`
      />
      {/* Warning icon + label for type mismatch */}
      {hasWarning && (
        <g transform={`translate(${midX}, ${midY - 14})`}>
          <rect
            x={-32}
            y={-10}
            width={64}
            height={18}
            rx={4}
            fill="rgba(240,160,32,0.15)"
            stroke="#f0a020"
            strokeWidth={1}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={9}
            fill="#f0a020"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            ⚠️ type mismatch
          </text>
        </g>
      )}
      {/* Delete button for edge */}
      <g transform={`translate(${midX}, ${midY})`}>
        <circle r={8} fill="#2a2a3e" stroke="#445" strokeWidth={1} />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={10}
          fill="#8899bb"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={handleDelete}
          className="bt-edge-delete"
        >
          ×
        </text>
      </g>
    </>
  );
};

export default BTFlowEdge;

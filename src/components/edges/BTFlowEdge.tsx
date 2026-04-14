import React from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
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
  const [isHovered, setIsHovered] = React.useState(false);
  const edgeData = data as BTFlowEdgeData | undefined;
  const hasWarning = !!edgeData?.typeWarning;
  const isInvalid = !!edgeData?.invalid;
  const isRunning = edgeData?.targetStatus === 'RUNNING';

  // Determine edge styling based on state
  const strokeColor = isInvalid ? '#e04040' : hasWarning ? '#f0a020' : '#6888aa';
  const strokeWidth = isInvalid || hasWarning ? 2.5 : 2;

  const [edgePath] = getBezierPath({
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
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{ ...style, stroke: strokeColor, strokeWidth }}
          className={`react-flow__edge bt-flow-edge${hasWarning ? ' bt-edge-warning' : ''}${isInvalid ? ' bt-edge-invalid' : ''}${isRunning ? ' bt-edge-running' : ''}`}
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
        <g
          transform={`translate(${midX}, ${midY})`}
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? 'auto' : 'none',
            transition: 'opacity 120ms ease',
          }}
          onClick={handleDelete}
          className="bt-edge-delete"
        >
          <circle r={8} fill="rgba(24, 30, 44, 0.96)" stroke="#51627f" strokeWidth={1} />
          <g
            transform="translate(-4.5, -5)"
            fill="none"
            stroke="#d7e3f4"
            strokeWidth={1.15}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <path d="M2 3.5h5" />
            <path d="M3 2h3" />
            <path d="M2.6 3.5 3.1 8h2.8l.5-4.5" />
            <path d="M4 4.7v2.2" />
            <path d="M5 4.7v2.2" />
          </g>
        </g>
      </g>
    </>
  );
};

export default BTFlowEdge;

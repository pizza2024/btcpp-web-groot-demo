import React, { useState, useMemo, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { STATUS_COLORS, BUILTIN_NODES } from '../../types/bt-constants';
import { useBTStore } from '../../store/btStore';

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
  isCollapsed?: boolean;
  [key: string]: unknown;
}

const BTFlowNode: React.FC<NodeProps> = React.memo(({ data, selected, id: nodeId }) => {
  const d = data as BTNodeData;
  const { label, category, colors, ports, preconditions, postconditions, description, status, isRoot, isCollapsed } = d;

  const statusColor = status ? STATUS_COLORS[status] : undefined;
  const borderColor = statusColor ?? (selected ? '#ffffff' : colors.border);
  const borderWidth = selected ? 2 : 1.5;

  const isLeaf = category === 'Action' || category === 'Condition';
  const isRootNode = isRoot === true;
  const isSubTree = category === 'SubTree';
  const isComposite = category === 'Control' || category === 'SubTree';

  // SubTree preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const { project } = useBTStore();

  // Memoize node definition lookup
  const nodeDef = useMemo(
    () => BUILTIN_NODES.find(n => n.type === d.nodeType),
    [d.nodeType]
  );

  // Memoize port entries grouping
  const { inputPorts, outputPorts, inoutPorts, hasPre, hasPost, portEntries, preEntries, postEntries } = useMemo(() => {
    // Group port entries by direction
    const definedPorts = nodeDef?.ports ?? [];
    const portEntries: Array<[string, string]> = [];

    // First add ports from node data (non-empty values)
    if (ports) {
      Object.entries(ports).forEach(([k, v]) => {
        if (v !== '') {
          portEntries.push([k, v]);
        }
      });
    }

    // Then add ports from definition that aren't in node data yet
    definedPorts.forEach((def) => {
      if (!portEntries.find(([k]) => k === def.name) && def.name !== '__autoremap') {
        portEntries.push([def.name, '']);
      }
    });

    const inputPorts: Array<[string, string]> = [];
    const outputPorts: Array<[string, string]> = [];
    const inoutPorts: Array<[string, string]> = [];

    portEntries.forEach(([k, v]) => {
      const def = definedPorts.find(p => p.name === k);
      if (def?.direction === 'input') {
        inputPorts.push([k, v]);
      } else if (def?.direction === 'output') {
        outputPorts.push([k, v]);
      } else if (def?.direction === 'inout') {
        inoutPorts.push([k, v]);
      } else {
        // No direction info - check name patterns
        const lowerK = k.toLowerCase();
        if (lowerK.startsWith('in') || lowerK.startsWith('input')) {
          inputPorts.push([k, v]);
        } else if (lowerK.startsWith('out') || lowerK.startsWith('output')) {
          outputPorts.push([k, v]);
        } else {
          inputPorts.push([k, v]);
        }
      }
    });

    const preEntries = Object.entries(preconditions ?? {}).filter(([, v]) => !!v?.trim());
    const postEntries = Object.entries(postconditions ?? {}).filter(([, v]) => !!v?.trim());
    const hasPre = preEntries.length > 0;
    const hasPost = postEntries.length > 0;

    return { inputPorts, outputPorts, inoutPorts, hasPre, hasPost, portEntries, preEntries, postEntries };
  }, [nodeDef, ports, preconditions, postconditions]);

  // Memoize handle list
  const handles = useMemo(() => {
    const result: React.ReactNode[] = [];

    // Target handle (input) - for all non-ROOT nodes
    if (!isRootNode) {
      result.push(
        <Handle
          key="target"
          type="target"
          position={Position.Top}
          style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
        />
      );
    }

    // Source handle (output) - only for nodes that can have children
    if (!isLeaf) {
      result.push(
        <Handle
          key="source"
          type="source"
          position={Position.Bottom}
          style={{ background: '#6888aa', border: 'none', width: 8, height: 8 }}
        />
      );
    }

    return result;
  }, [isRootNode, isLeaf]);

  // Double click opens edit modal (disabled for ROOT)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isRootNode) return;
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('bt-node-edit', {
      detail: { nodeId }
    }));
  };

  // Handle port double-click to edit
  const handlePortDoubleClick = (e: React.MouseEvent, portName: string, portDirection: string) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('bt-node-edit', {
      detail: { nodeId, portName, portDirection }
    }));
  };

  // Composite node preview popup
  const renderCompositePreview = () => {
    if (!isComposite || !showPreview) return null;

    // Node type icons
    const nodeTypeIcons: Record<string, string> = {
      Sequence: '→',
      Fallback: '?',
      SequenceWithMemory: '→M',
      ReactiveSequence: '↺→',
      ReactiveFallback: '↺?',
      Parallel: '⫿',
      ParallelAll: '⫿',
      IfThenElse: '⬡',
      WhileDoElse: '⟳',
      TryCatch: '⏳',
      Switch2: '⇡₂',
      Switch3: '⇡₃',
      Switch4: '⇡₄',
      Switch5: '⇡₅',
      Switch6: '⇡₆',
      ManualSelector: '☰',
      AsyncSequence: '→*',
      AsyncFallback: '?*',
      SubTree: '🌳',
    };

    const icon = nodeTypeIcons[d.nodeType] || '●';
    const nodeDef = BUILTIN_NODES.find(n => n.type === d.nodeType);
    const nodeDescription = nodeDef?.description || '';

    // For SubTree, show tree structure preview
    let treePreview: React.ReactNode = null;
    if (isSubTree) {
      const targetTree = project.trees.find(t => t.id === label);
      if (targetTree) {
        // Count nodes in subtree
        const countNodes = (node: import('../../types/bt').BTTreeNode): number => {
          return 1 + (node.children?.reduce((sum, c) => sum + countNodes(c), 0) ?? 0);
        };
        const totalNodes = countNodes(targetTree.root);

        // Render mini tree structure
        const renderMiniTree = (node: import('../../types/bt').BTTreeNode, depth: number = 0): React.ReactNode => {
          const indent = depth * 12;
          return (
            <div key={node.id} style={{ paddingLeft: indent, fontSize: 10, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{node.type}</span>
              {node.name && node.name !== node.type && <span style={{ color: 'var(--text-primary)' }}> ({node.name})</span>}
              {node.children?.map(child => renderMiniTree(child, depth + 1))}
            </div>
          );
        };

        treePreview = (
          <div style={{ marginTop: 6, maxHeight: 120, overflow: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
              Tree structure ({totalNodes} nodes)
            </div>
            {renderMiniTree(targetTree.root)}
          </div>
        );
      }
    }

    // Preconditions list
    const preList = preconditions && Object.entries(preconditions).filter(([, v]) => v).map(([k, v]) => ({ k, v }));

    return (
      <div
        ref={previewRef}
        className="composite-preview"
        style={{
          position: 'absolute',
          left: previewPos.x,
          top: previewPos.y,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: 10,
          minWidth: 160,
          maxWidth: 280,
          maxHeight: 280,
          overflow: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          fontSize: 12,
          animation: 'previewFadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.nodeType}</div>
          </div>
        </div>

        {/* Description */}
        {nodeDescription && (
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, fontStyle: 'italic' }}>
            {nodeDescription}
          </div>
        )}

        {/* Children count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 4,
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Children:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.childrenCount ?? 0}</span>
        </div>

        {/* Preconditions */}
        {preList && preList.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>⏱ Preconditions:</div>
            {preList.map(({ k, v }) => (
              <div key={k} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 2 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>{' '}
                <span style={{ color: 'var(--accent-color, #80c0ff)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tree structure for SubTree */}
        {treePreview}
      </div>
    );
  };

  // Preview ref for DOM measurement
  const previewRef = useRef<HTMLDivElement>(null);

  // Handle mouse events for composite node preview
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!isComposite) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const nodeWidth = rect.width;

    // Smart positioning: check if preview would overflow right edge of viewport
    const viewportWidth = window.innerWidth;
    const previewWidth = 280; // maxWidth of preview
    const estimatedX = rect.right + 8;

    let posX: number;
    if (estimatedX + previewWidth > viewportWidth - 20) {
      // Show on left side instead
      posX = -nodeWidth - 8 - previewWidth;
    } else {
      // Show on right side (default)
      posX = nodeWidth + 8;
    }

    setPreviewPos({ x: posX, y: -10 });
    setShowPreview(true);
  };

  const handleMouseLeave = () => {
    setShowPreview(false);
  };

  // ROOT node: render as a thin visual container bar
  if (isRootNode) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

      {/* Collapsed indicator */}
      {isCollapsed && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#f0a020',
            borderRadius: '50%',
            width: 16,
            height: 16,
            border: '2px solid var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#000',
            zIndex: 10,
          }}
          title="Subtree is collapsed"
        >
          ▶
        </div>
      )}

      {/* Category badge */}
      <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {isLeaf ? 'Action' : category}
      </div>

      {/* Label */}
      <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word' }}>
        {label}
      </div>

      {/* Ports display - Groot2 style */}
      {portEntries.length > 0 && (
        <div style={{
          marginTop: 6,
          marginBottom: 2,
          paddingTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: 10
        }}>
          {/* Input ports */}
          {inputPorts.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              {inputPorts.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 3,
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  onDoubleClick={(e) => handlePortDoubleClick(e, k, 'input')}
                  title={`Double-click to edit: ${k}`}
                >
                  <span style={{
                    fontSize: 8,
                    opacity: 0.6,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    minWidth: 24
                  }}>IN</span>
                  <span style={{ opacity: 0.8, fontWeight: 500 }}>{k}</span>
                  <span style={{
                    color: v.startsWith('{') ? '#80c0ff' : v ? '#ffe080' : '#666',
                    fontStyle: v.startsWith('{') ? 'italic' : (v ? 'normal' : 'italic')
                  }}>
                    {v || '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Output ports */}
          {outputPorts.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              {outputPorts.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 3,
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  onDoubleClick={(e) => handlePortDoubleClick(e, k, 'output')}
                  title={`Double-click to edit: ${k}`}
                >
                  <span style={{
                    fontSize: 8,
                    opacity: 0.6,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    minWidth: 24
                  }}>OUT</span>
                  <span style={{ opacity: 0.8, fontWeight: 500 }}>{k}</span>
                  <span style={{
                    color: v.startsWith('{') ? '#80c0ff' : v ? '#ffe080' : '#666',
                    fontStyle: v.startsWith('{') ? 'italic' : (v ? 'normal' : 'italic')
                  }}>
                    {v || '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* InOut ports */}
          {inoutPorts.length > 0 && (
            <div>
              {inoutPorts.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                    background: 'rgba(100,100,0,0.2)',
                    borderRadius: 3,
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  onDoubleClick={(e) => handlePortDoubleClick(e, k, 'inout')}
                  title={`Double-click to edit: ${k}`}
                >
                  <span style={{
                    fontSize: 8,
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    minWidth: 24,
                    color: '#ffe066'
                  }}>IN/OUT</span>
                  <span style={{ opacity: 0.8, fontWeight: 500 }}>{k}</span>
                  <span style={{
                    color: v.startsWith('{') ? '#80c0ff' : v ? '#ffe080' : '#666',
                    fontStyle: v.startsWith('{') ? 'italic' : (v ? 'normal' : 'italic')
                  }}>
                    {v || '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pre/Post condition details */}
      {(hasPre || hasPost) && (
        <div
          style={{
            marginTop: 6,
            marginBottom: 2,
            paddingTop: 4,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: 10,
            textAlign: 'left',
          }}
        >
          {hasPre && (
            <div
              style={{
                background: 'rgba(70, 170, 255, 0.22)',
                border: '1px solid rgba(90, 190, 255, 0.35)',
                borderRadius: 4,
                padding: '4px 6px',
                marginBottom: hasPost ? 4 : 0,
              }}
            >
              {preEntries.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ opacity: 0.9 }}>{k}:</span>
                  <span style={{ color: '#e8f6ff', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {hasPost && (
            <div
              style={{
                background: 'rgba(70, 170, 255, 0.22)',
                border: '1px solid rgba(90, 190, 255, 0.35)',
                borderRadius: 4,
                padding: '4px 6px',
              }}
            >
              {postEntries.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ opacity: 0.9 }}>{k}:</span>
                  <span style={{ color: '#e8f6ff', fontWeight: 600 }}>{v}</span>
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

      {/* Composite node preview popup */}
      {renderCompositePreview()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if data changed meaningfully
  const prev = prevProps.data as BTNodeData;
  const next = nextProps.data as BTNodeData;
  return (
    prev.label === next.label &&
    prev.status === next.status &&
    prev.selected === nextProps.selected &&
    JSON.stringify(prev.ports) === JSON.stringify(next.ports) &&
    JSON.stringify(prev.preconditions) === JSON.stringify(next.preconditions) &&
    JSON.stringify(prev.postconditions) === JSON.stringify(next.postconditions) &&
    prev.colors.bg === next.colors.bg &&
    prev.colors.border === next.colors.border &&
    prev.isRoot === next.isRoot &&
    prev.isCollapsed === next.isCollapsed
  );
});

export default BTFlowNode;

import type { BTProject, BTTree, BTTreeNode, BTNodeDefinition, BTNodeCategory, BTPort } from '../types/bt';
import {
  EDITOR_ROOT_TYPE,
  createNodeModelsForFormat,
  getBuiltinNodesForFormat,
  isBuiltinNodeType,
  normalizeNodeTypeForV3,
} from '../types/bt-constants';

// ─── XML → Project ─────────────────────────────────────────────────────────

// Known XML element names that are categories (not node types)
const LEAF_CATEGORY_TAGS = new Set(['Action', 'Condition']);
const PRE_KEYS = ['_failureIf', '_successIf', '_skipIf', '_while'];
const POST_KEYS = ['_onSuccess', '_onFailure', '_onHalted', '_post'];

// XML format versions supported
export type XMLFormat = 3 | 4;

export interface MissingNodeModelCandidate {
  type: string;
  category: BTNodeCategory;
  categoryOptions: BTNodeCategory[];
  ports: BTPort[];
}

function detectXmlFormat(root: Element): XMLFormat {
  const raw = root.getAttribute('BTCPP_format')?.trim();
  return raw === '3' ? 3 : 4;
}

function parseTreeNode(
  el: Element,
  createNodeId: () => string,
  format: XMLFormat,
  depth = 0
): BTTreeNode {
  const xmlTag = el.tagName;
  const id = createNodeId();
  const idAttr = el.getAttribute('ID');

  // For Action/Condition elements, the actual node type is the ID attribute
  const isLeafCategory = LEAF_CATEGORY_TAGS.has(xmlTag);
  if (isLeafCategory && !idAttr) {
    throw new Error(`<${xmlTag}> node is missing required ID attribute`);
  }
  const rawType = isLeafCategory && idAttr ? idAttr : xmlTag;
  const type = format === 3 ? normalizeNodeTypeForV3(rawType) : rawType;

  const ports: Record<string, string> = {};
  const preconditions: Record<string, string> = {};
  const postconditions: Record<string, string> = {};
  let portRemap: Record<string, string> | undefined;

  Array.from(el.attributes).forEach((attr) => {
    if (attr.name === 'ID' || attr.name === 'name') return;
    if (attr.name === 'port_remap') {
      // Parse "local:=external,..." into { local: external, ... }
      portRemap = {};
      attr.value.split(',').forEach((pair) => {
        const [local, external] = pair.split(':=');
        if (local && external) portRemap![local.trim()] = external.trim();
      });
    } else if (PRE_KEYS.includes(attr.name)) {
      preconditions[attr.name] = attr.value;
    } else if (POST_KEYS.includes(attr.name)) {
      postconditions[attr.name] = attr.value;
    } else {
      ports[attr.name] = attr.value;
    }
  });

  // For builtin control/decorator nodes, 'name' attr is an alias.
  // For SubTree, 'ID' is the target tree ID — store as name.
  // For leaf nodes (Action/Condition), type IS the identifier — no alias needed.
  let name: string | undefined;
  if (xmlTag === 'SubTree') {
    name = idAttr ?? undefined;
  } else if (!isLeafCategory) {
    name = el.getAttribute('name') ?? undefined;
  }

  const children: BTTreeNode[] = [];
  const cdataParts: string[] = [];
  Array.from(el.childNodes).forEach((child) => {
    if (child.nodeType === Node.CDATA_SECTION_NODE) {
      cdataParts.push(child.textContent ?? '');
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      children.push(parseTreeNode(child as Element, createNodeId, format, depth + 1));
    }
  });
  const cdata = cdataParts.length > 0 ? cdataParts.join('') : undefined;

  return {
    id,
    type,
    name,
    ports,
    children,
    ...(Object.keys(preconditions).length > 0 && { preconditions }),
    ...(Object.keys(postconditions).length > 0 && { postconditions }),
    ...(portRemap && Object.keys(portRemap).length > 0 && { portRemap }),
    ...(cdata !== undefined && { cdata }),
  };
}

function createNodeIdFactory(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `n_${counter.toString(36)}`;
  };
}

export function analyzeMissingNodeModels(xmlText: string, format?: XMLFormat): MissingNodeModelCandidate[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parse error: ' + parseError.textContent);
  }

  const root = doc.documentElement;
  const detectedFormat: XMLFormat = format ?? detectXmlFormat(root);
  const declaredTypes = new Set<string>();
  const modelEl = root.querySelector(':scope > TreeNodesModel')
    ?? root.querySelector(':scope > TreeConfiguration > TreeNodesModel');
  if (modelEl) {
    Array.from(modelEl.children).forEach((catEl) => {
      declaredTypes.add(catEl.getAttribute('ID') || catEl.tagName);
    });
  }

  const builtinTypes = new Set(getBuiltinNodesForFormat(detectedFormat).map((node) => node.type));
  const records = new Map<string, { xmlTags: Set<string>; maxChildren: number; ports: Map<string, BTPort> }>();

  const visit = (el: Element) => {
    const xmlTag = el.tagName;
    const idAttr = el.getAttribute('ID');
    const isLeafCategory = LEAF_CATEGORY_TAGS.has(xmlTag);
    const rawType = isLeafCategory && idAttr ? idAttr : xmlTag;
    const type = detectedFormat === 3 ? normalizeNodeTypeForV3(rawType) : rawType;

    if (!builtinTypes.has(type) && !declaredTypes.has(type)) {
      const existing = records.get(type) ?? {
        xmlTags: new Set<string>(),
        maxChildren: 0,
        ports: new Map<string, BTPort>(),
      };
      existing.xmlTags.add(xmlTag);
      existing.maxChildren = Math.max(existing.maxChildren, el.children.length);

      Array.from(el.attributes).forEach((attr) => {
        if (attr.name === 'ID' || attr.name === 'name' || attr.name === 'port_remap') return;
        if (PRE_KEYS.includes(attr.name) || POST_KEYS.includes(attr.name)) return;
        if (!existing.ports.has(attr.name)) {
          existing.ports.set(attr.name, { name: attr.name, direction: 'input' });
        }
      });

      records.set(type, existing);
    }

    Array.from(el.children).forEach((child) => visit(child as Element));
  };

  root.querySelectorAll(':scope > BehaviorTree').forEach((treeEl) => {
    const firstChild = treeEl.firstElementChild;
    if (firstChild) visit(firstChild);
  });

  return Array.from(records.entries())
    .map(([type, record]) => {
      const categoryOptions = inferCategoryOptions(record.xmlTags, record.maxChildren);
      return {
        type,
        category: inferDefaultCategory(categoryOptions),
        categoryOptions,
        ports: Array.from(record.ports.values()),
      };
    })
    .sort((a, b) => a.type.localeCompare(b.type));
}

function inferCategoryOptions(xmlTags: Set<string>, maxChildren: number): BTNodeCategory[] {
  if (xmlTags.has('Action')) return ['Action'];
  if (xmlTags.has('Condition')) return ['Condition'];
  if (maxChildren > 1) return ['Control'];
  if (maxChildren === 1) return ['Decorator', 'Control'];
  return ['Action', 'Condition'];
}

function inferDefaultCategory(options: BTNodeCategory[]): BTNodeCategory {
  if (options.includes('Decorator')) return 'Decorator';
  return options[0] ?? 'Action';
}

export function parseXML(xmlText: string): BTProject {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parse error: ' + parseError.textContent);
  }

  const root = doc.documentElement;
  const detectedFormat: XMLFormat = detectXmlFormat(root);
  const builtinNodes = getBuiltinNodesForFormat(detectedFormat);

  // Parse trees
  const trees: BTTree[] = [];
  const createNodeId = createNodeIdFactory();
  root.querySelectorAll(':scope > BehaviorTree').forEach((btEl) => {
    const treeId = btEl.getAttribute('ID') || `Tree_${trees.length + 1}`;
    const rootEl = btEl.firstElementChild;
    if (!rootEl) return;
    const parsedRoot = parseTreeNode(rootEl, createNodeId, detectedFormat);
    const editorRoot: BTTreeNode = {
      id: createNodeId(),
      type: EDITOR_ROOT_TYPE,
      ports: {},
      children: [parsedRoot],
    };
    trees.push({ id: treeId, root: editorRoot });
  });

  if (trees.length === 0) {
    throw new Error('No <BehaviorTree> elements found in XML');
  }

  // Parse TreeNodesModel (optional; may be direct child of root or nested in TreeConfiguration)
  const nodeModels: BTNodeDefinition[] = [];
  const modelEl = root.querySelector(':scope > TreeNodesModel')
    ?? root.querySelector(':scope > TreeConfiguration > TreeNodesModel');
  if (modelEl) {
    Array.from(modelEl.children).forEach((catEl) => {
      // XML uses Action/Condition tags directly as category
      const xmlCat = catEl.tagName;
      const category: BTNodeDefinition['category'] =
        xmlCat as BTNodeDefinition['category'];
      const rawType = catEl.getAttribute('ID') || catEl.tagName;
      const type = detectedFormat === 3 ? normalizeNodeTypeForV3(rawType) : rawType;
      const ports = Array.from(catEl.querySelectorAll('input_port, output_port, inout_port')).map(
        (p) => ({
          name: p.getAttribute('name') || '',
          direction: (p.tagName.replace('_port', '') as 'input' | 'output' | 'inout'),
          description: p.getAttribute('description') || p.textContent?.trim() || '',
        })
      );
      nodeModels.push({ type, category, ports });
    });
  }

  // Discover all unique node types used in the tree
  const discoveredTypes = new Set<string>();
  const collectTypes = (node: BTTreeNode) => {
    if (node.type !== EDITOR_ROOT_TYPE) {
      discoveredTypes.add(node.type);
    }
    node.children.forEach(collectTypes);
  };
  trees.forEach((t) => collectTypes(t.root));

  // Add missing leaf nodes (not in TreeNodesModel, not builtins)
  // Any unknown type is treated as a custom Action node
  const existingTypes = new Set([
    ...builtinNodes.map((n) => n.type),
    ...nodeModels.map((m) => m.type),
  ]);
  const missingCandidates = new Map(
    analyzeMissingNodeModels(xmlText, detectedFormat).map((candidate) => [candidate.type, candidate])
  );
  const missingLeafModels: BTNodeDefinition[] = [];
  discoveredTypes.forEach((type) => {
    if (!existingTypes.has(type)) {
      const candidate = missingCandidates.get(type);
      missingLeafModels.push({
        type,
        category: candidate?.category ?? 'Action',
        ...(candidate?.ports.length ? { ports: candidate.ports } : {}),
      });
    }
  });

  // Merge with builtins (builtin wins)
  const mergedModels = createNodeModelsForFormat([...nodeModels, ...missingLeafModels], detectedFormat);

  const mainTreeId =
    root.getAttribute('main_tree_to_execute') ||
    trees[0].id;

  return { trees, nodeModels: mergedModels, mainTreeId, exportFormat: detectedFormat };
}

// ─── Project → XML ─────────────────────────────────────────────────────────

function serializeNode(
  node: BTTreeNode,
  indent: number,
  nodeModels: BTNodeDefinition[],
  format: XMLFormat = 4
): string {
  // ROOT is a visual-only editor node — skip it and serialize its children directly
  if (node.type === EDITOR_ROOT_TYPE) {
    return node.children.map((c) => serializeNode(c, indent, nodeModels, format)).join('\n');
  }

  const pad = '  '.repeat(indent);
  const attrs: string[] = [];

  // Determine node category
  const nodeDefinition = nodeModels.find((n) => n.type === node.type);
  const category = nodeDefinition?.category ?? 'Action';

  let tagName: string;
  if (category === 'Action' || category === 'Condition') {
    // Format 4: use concrete node type tags (e.g., <MoveToGoal ... />)
    // Format 3: use generic category tags with ID attribute (e.g., <Action ID="MoveToGoal" ... />)
    if (format === 3) {
      tagName = category;
      attrs.push(`ID="${escapeXml(node.type)}"`);
      if (node.name && node.name !== node.type) {
        attrs.push(`name="${escapeXml(node.name)}"`);
      }
    } else {
      tagName = node.type;
      if (node.name && node.name !== node.type) {
        attrs.push(`name="${escapeXml(node.name)}"`);
      }
    }
  } else if (category === 'SubTree') {
    tagName = 'SubTree';
    // name holds the target tree ID for SubTree nodes
    attrs.push(`ID="${escapeXml(node.name ?? node.type)}"`);
    // Port remapping: local_port:=external_port,...
    if (node.portRemap && Object.keys(node.portRemap).length > 0) {
      const remapStr = Object.entries(node.portRemap)
        .map(([k, v]) => `${k}:=${v}`)
        .join(',');
      attrs.push(`port_remap="${escapeXml(remapStr)}"`);
    }
  } else {
    tagName = node.type;
    if (node.name && node.name !== node.type) {
      attrs.push(`name="${escapeXml(node.name)}"`);
    }
  }

  getSerializedPortEntries(node, nodeDefinition, category).forEach(([k, v]) => {
    attrs.push(`${k}="${escapeXml(v)}"`);
  });

  // Preconditions
  Object.entries(node.preconditions ?? {}).forEach(([k, v]) => {
    attrs.push(`${k}="${escapeXml(v)}"`);
  });

  // Postconditions
  Object.entries(node.postconditions ?? {}).forEach(([k, v]) => {
    attrs.push(`${k}="${escapeXml(v)}"`);
  });

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

  if (node.children.length === 0 && !node.cdata) {
    return `${pad}<${tagName}${attrStr}/>`;
  }

  const childLines = node.children.map((c) => serializeNode(c, indent + 1, nodeModels, format)).join('\n');
  const cdataLine = node.cdata ? `\n${pad}  ${wrapCdata(node.cdata)}` : '';
  return `${pad}<${tagName}${attrStr}>${cdataLine}\n${childLines}\n${pad}</${tagName}>`;
}

function wrapCdata(content: string): string {
  // XML forbids "]]>" inside a single CDATA section, so split safely.
  return `<![CDATA[${content.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function getSerializedPortEntries(
  node: BTTreeNode,
  nodeDefinition: BTNodeDefinition | undefined,
  category: BTNodeCategory
): Array<[string, string]> {
  const orderedEntries: Array<[string, string]> = [];
  const seen = new Set<string>();
  const includeEmptyDeclaredPorts = category === 'Action' || category === 'Condition';

  (nodeDefinition?.ports ?? []).forEach((port) => {
    if (port.name === '__autoremap') return;
    const value = node.ports[port.name];
    if (value !== undefined || includeEmptyDeclaredPorts) {
      orderedEntries.push([port.name, value ?? '']);
      seen.add(port.name);
    }
  });

  Object.entries(node.ports).forEach(([name, value]) => {
    if (seen.has(name)) return;
    orderedEntries.push([name, value]);
  });

  return orderedEntries;
}

export function serializeXML(project: BTProject, format?: XMLFormat): string {
  // Use format from parameter, fall back to project.exportFormat, default to 4
  const targetFormat: XMLFormat = format ?? project.exportFormat ?? 4;

  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push(`<root BTCPP_format="${targetFormat}" main_tree_to_execute="${escapeXml(project.mainTreeId)}">`);

  project.trees.forEach((tree) => {
    lines.push(`  <BehaviorTree ID="${escapeXml(tree.id)}">`);
    lines.push(serializeNode(tree.root, 2, project.nodeModels, targetFormat));
    lines.push('  </BehaviorTree>');
  });

  // TreeNodesModel — only custom (non-builtin) nodes
  const builtinTypes = new Set(getBuiltinNodesForFormat(targetFormat).map((n) => n.type));
  const customModels = project.nodeModels.filter((m) => !builtinTypes.has(m.type));

  if (customModels.length > 0) {
    if (targetFormat === 3) {
      // Format 3: TreeNodesModel directly under root (no TreeConfiguration wrapper)
      lines.push('  <TreeNodesModel>');
      customModels.forEach((m) => {
        const cat = m.category;
        if (!m.ports || m.ports.length === 0) {
          lines.push(`    <${cat} ID="${escapeXml(m.type)}"/>`);
        } else {
          lines.push(`    <${cat} ID="${escapeXml(m.type)}">`);
          m.ports.forEach((p) => {
            lines.push(`      <${p.direction}_port name="${escapeXml(p.name)}">${escapeXml(p.description || '')}</${p.direction}_port>`);
          });
          lines.push(`    </${cat}>`);
        }
      });
      lines.push('  </TreeNodesModel>');
    } else {
      // Format 4: TreeNodesModel wrapped in TreeConfiguration
      lines.push('  <TreeConfiguration>');
      lines.push('    <TreeNodesModel>');
      customModels.forEach((m) => {
        const cat = m.category;
        if (!m.ports || m.ports.length === 0) {
          lines.push(`      <${cat} ID="${escapeXml(m.type)}"/>`);
        } else {
          lines.push(`      <${cat} ID="${escapeXml(m.type)}">`);
          m.ports.forEach((p) => {
            lines.push(`        <${p.direction}_port name="${escapeXml(p.name)}">${escapeXml(p.description || '')}</${p.direction}_port>`);
          });
          lines.push(`      </${cat}>`);
        }
      });
      lines.push('    </TreeNodesModel>');
      lines.push('  </TreeConfiguration>');
    }
  }

  lines.push('</root>');
  return lines.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Default empty project ──────────────────────────────────────────────────

export function defaultProject(): BTProject {
  // GRoot2 editor starts with an empty ROOT node — user adds the first child
  const root: BTTreeNode = {
    id: 'n_root',
    type: EDITOR_ROOT_TYPE,
    ports: {},
    children: [],
  };
  return {
    trees: [{ id: 'MainTree', root }],
    nodeModels: [...getBuiltinNodesForFormat(4)],
    mainTreeId: 'MainTree',
    exportFormat: 4,
  };
}

// ─── Sample project ──────────────────────────────────────────────────────────

export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence name="Root">
      <Condition ID="CheckBattery"/>
      <Fallback>
        <Condition ID="IsAtGoal"/>
        <Action ID="MoveToGoal" goal="{target_pose}"/>
      </Fallback>
      <SubTree ID="GraspPipeline"/>
    </Sequence>
  </BehaviorTree>
  <BehaviorTree ID="GraspPipeline">
    <Sequence>
      <Action ID="OpenGripper"/>
      <Action ID="ApproachObject" distance="0.05"/>
      <RetryUntilSuccessful num_attempts="3">
        <Action ID="CloseGripper"/>
      </RetryUntilSuccessful>
    </Sequence>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="MoveToGoal">
      <input_port name="goal">Target pose</input_port>
    </Action>
    <Action ID="OpenGripper"/>
    <Action ID="ApproachObject">
      <input_port name="distance">Approach distance (m)</input_port>
    </Action>
    <Action ID="CloseGripper"/>
    <Condition ID="CheckBattery"/>
    <Condition ID="IsAtGoal"/>
  </TreeNodesModel>
</root>`;

// ─── Sample v3 project (for backward compatibility testing) ────────────────────

export const SAMPLE_XML_V3 = `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="3" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence name="Root">
      <Condition ID="CheckBattery"/>
      <Fallback>
        <Condition ID="IsAtGoal"/>
        <Action ID="MoveToGoal" goal="{target_pose}"/>
      </Fallback>
      <SubTree ID="GraspPipeline"/>
    </Sequence>
  </BehaviorTree>
  <BehaviorTree ID="GraspPipeline">
    <Sequence>
      <Action ID="OpenGripper"/>
      <Action ID="ApproachObject" distance="0.05"/>
      <RetryUntilSuccessful num_attempts="3">
        <Action ID="CloseGripper"/>
      </RetryUntilSuccessful>
    </Sequence>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="MoveToGoal">
      <input_port name="goal">Target pose</input_port>
    </Action>
    <Action ID="OpenGripper"/>
    <Action ID="ApproachObject">
      <input_port name="distance">Approach distance (m)</input_port>
    </Action>
    <Action ID="CloseGripper"/>
    <Condition ID="CheckBattery"/>
    <Condition ID="IsAtGoal"/>
  </TreeNodesModel>
</root>`;

// ─── Blackboard Expression Utilities ─────────────────────────────────────────

/**
 * Validate a blackboard key (must be valid identifier)
 */
export function isValidBlackboardKey(key: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

// ─── Port Type Validation ─────────────────────────────────────────────────────

export interface PortInfo {
  name: string;
  direction: 'input' | 'output' | 'inout';
  type?: string; // Optional type constraint
}

/**
 * Check if two ports are type-compatible for connection
 * Returns { valid: boolean, warning?: string }
 */
export function validatePortConnection(
  sourcePort: PortInfo,
  targetPort: PortInfo
): { valid: boolean; warning?: string } {
  // Input ports should connect FROM output ports
  if (sourcePort.direction === 'input') {
    return { valid: false, warning: 'Source port is an input' };
  }

  // Output ports should connect TO input ports
  if (targetPort.direction === 'output') {
    return { valid: false, warning: 'Target port is an output' };
  }

  // Check type compatibility if both have types
  if (sourcePort.type && targetPort.type && sourcePort.type !== targetPort.type) {
    // Same type is compatible, different types show warning but allow
    if (sourcePort.type === 'any' || targetPort.type === 'any') {
      return { valid: true };
    }
    return { valid: true, warning: `Type mismatch: ${sourcePort.type} → ${targetPort.type}` };
  }

  return { valid: true };
}

// ─── Node Model Validation ────────────────────────────────────────────────────

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  nodeType?: string;
  message: string;
}

/**
 * Validate a node against its model definition
 * Returns array of validation issues (empty = valid)
 */
export function validateNode(
  node: BTTreeNode,
  nodeModels: BTNodeDefinition[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Find model definition
  const model = nodeModels.find(n => n.type === node.type);
  const ports = model?.ports;
  
  if (!ports || ports.length === 0) return issues; // No ports to validate

  ports.forEach(portDef => {
    const value = node.ports[portDef.name];
    
    // Check required ports (ports without defaults are required)
    if (portDef.required && (value === undefined || value === '')) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        nodeType: node.type,
        message: `Required port "${portDef.name}" is missing`,
      });
    }
    
    // Check blackboard reference validity
    if (value && value.startsWith('{')) {
      if (!isValidBlackboardKey(value.slice(1, -1))) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          nodeType: node.type,
          message: `Port "${portDef.name}" has invalid blackboard key "${value}"`,
        });
      }
    }
  });
  
  return issues;
}

/**
 * Validate entire project for completeness and correctness
 */
export function validateProject(project: BTProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  project.trees.forEach(tree => {
    collectNodeIssues(tree.root, project.nodeModels, issues);
  });
  
  return issues;
}

function collectNodeIssues(
  node: BTTreeNode,
  nodeModels: BTNodeDefinition[],
  issues: ValidationIssue[]
): void {
  issues.push(...validateNode(node, nodeModels));
  node.children.forEach(child => collectNodeIssues(child, nodeModels, issues));
}

/**
 * Get direction label for port
 */
export function getPortDirectionLabel(direction: 'input' | 'output' | 'inout'): string {
  switch (direction) {
    case 'input': return '←';
    case 'output': return '→';
    case 'inout': return '↔';
    default: return '?';
  }
}

/**
 * Check if a string is a blackboard reference (e.g., "{goal}")
 */
export function isBlackboardRef(value: string): boolean {
  if (!value.startsWith('{') || !value.endsWith('}') || value.length <= 2) return false;
  const key = value.slice(1, -1);
  return isValidBlackboardKey(key);
}

/**
 * Extract the key from a blackboard reference (e.g., "{goal}" -> "goal")
 */
export function extractBlackboardKey(value: string): string | null {
  if (!value.startsWith('{') || !value.endsWith('}') || value.length <= 2) return null;
  const key = value.slice(1, -1);
  return isValidBlackboardKey(key) ? key : null;
}

/**
 * Parse a value that may contain blackboard references.
 * Returns an array of segments: { type: 'literal' | 'blackboard', value: string }
 */
export function parseBlackboardExpression(value: string): Array<{ type: 'literal' | 'blackboard'; value: string }> {
  if (!value.includes('{')) {
    return [{ type: 'literal', value }];
  }

  const segments: Array<{ type: 'literal' | 'blackboard'; value: string }> = [];
  let current = '';
  let inBraces = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (char === '{') {
      if (current) {
        segments.push({ type: 'literal', value: current });
        current = '';
      }
      inBraces = true;
      current = '{';
    } else if (char === '}') {
      current += '}';
      inBraces = false;
      const key = extractBlackboardKey(current);
      if (key) {
        segments.push({ type: 'blackboard', value: key });
      } else {
        segments.push({ type: 'literal', value: current });
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    segments.push({ type: inBraces ? 'blackboard' : 'literal', value: current });
  }

  return segments;
}

// ─── Name Validation (blacklist approach per BT.CPP rules) ───────────────────

// Forbidden characters in model names and port names (ASCII only; Unicode is allowed)
// Based on name_validation_rules.md from btcpp-groot2-research
const FORBIDDEN_NAME_CHARS = new Set([
  ' ', '\t', '\n', '\r', '<', '>', '&', '"', "'", '/', '\\', ':', '*', '?', '|', '.', '-'
]);

// Reserved attribute names that cannot be used as port names
// These are XML/BT.CPP reserved attributes
const RESERVED_PORT_NAMES = new Set([
  'ID', 'name', '_description', '_skipIf', '_successIf', '_failureIf',
  '_while', '_onSuccess', '_onFailure', '_onHalted', '_post', '_autoremap', '__shared_blackboard'
]);

/**
 * Find forbidden character in a name (for model/port names).
 * Returns the forbidden character or null if valid.
 * Unicode bytes (>= 0x80) are always allowed.
 */
function findForbiddenChar(name: string): string | null {
  for (const c of name) {
    const code = c.charCodeAt(0);
    // Allow Unicode (multibyte UTF-8 will have high bits set)
    if (code >= 0x80) continue;
    // Block control characters (ASCII 0-31 and 127)
    if (code < 32 || code === 127) return c;
    // Check forbidden list
    if (FORBIDDEN_NAME_CHARS.has(c)) return c;
  }
  return null;
}

/**
 * Validate a model name (node type name).
 * Returns an error message string if invalid, or null if valid.
 */
export function validateModelName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Node type name cannot be empty';
  if (trimmed === 'Root') return 'Node type name "Root" is reserved';
  const forbidden = findForbiddenChar(trimmed);
  if (forbidden) return `Node type name contains forbidden character "${forbidden}"`;
  return null;
}

/**
 * Validate a port name.
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePortName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Port name cannot be empty';
  if (/^\d/.test(trimmed)) return 'Port name cannot start with a digit';
  if (RESERVED_PORT_NAMES.has(trimmed)) return `Port name "${trimmed}" is a reserved attribute`;
  const forbidden = findForbiddenChar(trimmed);
  if (forbidden) return `Port name contains forbidden character "${forbidden}"`;
  return null;
}

/**
 * Validate an instance name (node label in tree).
 * More relaxed than model/port names — only control chars are forbidden.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateInstanceName(name: string): string | null {
  for (const c of name) {
    const code = c.charCodeAt(0);
    // Allow Unicode (>= 0x80)
    if (code >= 0x80) continue;
    // Block control characters (ASCII 0-8, 11-12, 14-31, 127)
    if (code < 9 || code === 11 || code === 12 || (code >= 14 && code < 32) || code === 127) {
      return `Instance name contains invalid control character`;
    }
  }
  return null;
}

// ─── Node Model Definition Validation ───────────────────────────────────────

const VALID_PORT_TYPES = new Set(['', 'string', 'int', 'unsigned', 'bool', 'double', 'NodeStatus', 'Any']);

/**
 * Validate a node model definition (BTNodeDefinition).
 * Checks port type values, port name validity, and duplicate port names.
 * Returns array of validation issues (empty = valid).
 */
export function validateNodeModel(
  def: BTNodeDefinition,
  existingModels: BTNodeDefinition[] = []
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate node type name
  const modelNameError = validateModelName(def.type);
  if (modelNameError) {
    issues.push({ severity: 'error', nodeType: def.type, message: modelNameError });
  } else {
    const trimmedType = def.type.trim();
    // Check for duplicate node type (case-sensitive)
    const duplicate = existingModels.find(m => m.type === trimmedType && m !== def);
    if (duplicate) {
      issues.push({ severity: 'error', nodeType: def.type, message: `Node type "${trimmedType}" already exists` });
    }

    // Check for built-in node type collision.
    // Prefer builtins discovered from existingModels (mode-aware); fall back to v4 for standalone validation.
    const builtin =
      existingModels.find(m => m.type === trimmedType && m.builtin)
      ?? (existingModels.length === 0 && isBuiltinNodeType(trimmedType, 4)
        ? { type: trimmedType, builtin: true }
        : undefined);
    if (builtin && !def.builtin) {
      issues.push({ severity: 'error', nodeType: def.type, message: `Node type "${trimmedType}" conflicts with a built-in node` });
    }
  }

  // Validate category
  const validCategories = ['Control', 'Decorator', 'Action', 'Condition', 'SubTree'];
  if (!validCategories.includes(def.category)) {
    issues.push({ severity: 'error', nodeType: def.type, message: `Invalid category "${def.category}"` });
  }

  // Validate ports
  const ports = def.ports ?? [];
  const seenPortNames = new Set<string>();

  ports.forEach((port, idx) => {
    const portName = port.name.trim();

    // Check for empty port name
    if (!portName) {
      issues.push({
        severity: 'warning',
        nodeType: def.type,
        message: `Port #${idx + 1} has an empty name and will be skipped`,
      });
      return;
    }

    // Check for duplicate port name
    if (seenPortNames.has(portName)) {
      issues.push({
        severity: 'error',
        nodeType: def.type,
        message: `Duplicate port name "${portName}"`,
      });
    }
    seenPortNames.add(portName);

    // Validate port name using blacklist rules
    const portNameError = validatePortName(portName);
    if (portNameError) {
      issues.push({
        severity: 'error',
        nodeType: def.type,
        message: portNameError,
      });
    }

    // Validate port type value
    if (port.portType && !VALID_PORT_TYPES.has(port.portType)) {
      issues.push({
        severity: 'error',
        nodeType: def.type,
        message: `Port "${portName}" has invalid type "${port.portType}". Must be one of: ${[...VALID_PORT_TYPES].filter(t => t).join(', ')}`,
      });
    }

    // Validate port direction
    const validDirections = ['input', 'output', 'inout'];
    if (!validDirections.includes(port.direction)) {
      issues.push({
        severity: 'error',
        nodeType: def.type,
        message: `Port "${portName}" has invalid direction "${port.direction}"`,
      });
    }
  });

  return issues;
}

/**
 * Validate all node models in a project.
 * Returns combined validation issues from all models.
 */
export function validateAllNodeModels(project: BTProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  project.nodeModels.forEach(def => {
    issues.push(...validateNodeModel(def, project.nodeModels));
  });
  return issues;
}

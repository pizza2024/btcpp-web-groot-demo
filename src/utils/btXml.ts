import type { BTProject, BTTree, BTTreeNode, BTNodeDefinition } from '../types/bt';
import { BUILTIN_NODES } from '../types/bt-constants';

// ─── XML → Project ─────────────────────────────────────────────────────────

// Known XML element names that are categories (not node types)
const LEAF_CATEGORY_TAGS = new Set(['Action', 'Condition']);

function parseTreeNode(el: Element, depth = 0): BTTreeNode {
  const xmlTag = el.tagName;
  const id = `n_${Math.random().toString(36).slice(2, 9)}`;
  const idAttr = el.getAttribute('ID');

  // For Action/Condition elements, the actual node type is the ID attribute
  const isLeafCategory = LEAF_CATEGORY_TAGS.has(xmlTag);
  const type = isLeafCategory && idAttr ? idAttr : xmlTag;

  const ports: Record<string, string> = {};
  Array.from(el.attributes).forEach((attr) => {
    if (attr.name !== 'ID' && attr.name !== 'name') {
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
  Array.from(el.children).forEach((child) => {
    children.push(parseTreeNode(child as Element, depth + 1));
  });

  return { id, type, name, ports, children };
}

export function parseXML(xmlText: string): BTProject {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parse error: ' + parseError.textContent);
  }

  const root = doc.documentElement;

  // Parse trees
  const trees: BTTree[] = [];
  root.querySelectorAll(':scope > BehaviorTree').forEach((btEl) => {
    const treeId = btEl.getAttribute('ID') || `Tree_${trees.length + 1}`;
    const rootEl = btEl.firstElementChild;
    if (!rootEl) return;
    trees.push({ id: treeId, root: parseTreeNode(rootEl) });
  });

  if (trees.length === 0) {
    throw new Error('No <BehaviorTree> elements found in XML');
  }

  // Parse TreeNodesModel (optional)
  const nodeModels: BTNodeDefinition[] = [];
  const modelEl = root.querySelector(':scope > TreeNodesModel');
  if (modelEl) {
    Array.from(modelEl.children).forEach((catEl) => {
      // XML uses Action/Condition tags; normalize to 'Leaf' for palette
      const xmlCat = catEl.tagName;
      const category: BTNodeDefinition['category'] =
        xmlCat === 'Action' || xmlCat === 'Condition' ? 'Leaf' : (xmlCat as BTNodeDefinition['category']);
      const type = catEl.getAttribute('ID') || catEl.tagName;
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
    discoveredTypes.add(node.type);
    node.children.forEach(collectTypes);
  };
  trees.forEach((t) => collectTypes(t.root));

  // Add missing leaf nodes (not in TreeNodesModel, not builtins)
  // Any unknown type is treated as a custom Action/Condition (Leaf)
  const existingTypes = new Set([
    ...BUILTIN_NODES.map((n) => n.type),
    ...nodeModels.map((m) => m.type),
  ]);
  const missingLeafModels: BTNodeDefinition[] = [];
  discoveredTypes.forEach((type) => {
    if (!existingTypes.has(type)) {
      missingLeafModels.push({ type, category: 'Leaf' });
    }
  });

  // Merge with builtins (builtin wins)
  const builtinTypes = new Set(BUILTIN_NODES.map((n) => n.type));
  const mergedModels: BTNodeDefinition[] = [
    ...BUILTIN_NODES,
    ...nodeModels.filter((m) => !builtinTypes.has(m.type)),
    ...missingLeafModels,
  ];

  const mainTreeId =
    root.getAttribute('main_tree_to_execute') ||
    trees[0].id;

  return { trees, nodeModels: mergedModels, mainTreeId };
}

// ─── Project → XML ─────────────────────────────────────────────────────────

function serializeNode(
  node: BTTreeNode,
  indent: number,
  nodeModels: BTNodeDefinition[]
): string {
  const pad = '  '.repeat(indent);
  const attrs: string[] = [];

  // Determine if this is a leaf (custom action/condition) or SubTree
  const builtinNode = BUILTIN_NODES.find((n) => n.type === node.type);
  const modelNode = nodeModels.find((n) => n.type === node.type);
  const category = builtinNode?.category ?? modelNode?.category ?? 'Leaf';

  let tagName: string;
  if (category === 'Leaf') {
    // Wrap in <Action ID="TypeName"> (BT.CPP uses Action/Condition as XML tags)
    tagName = 'Action';
    attrs.push(`ID="${escapeXml(node.type)}"`);
  } else if (category === 'SubTree') {
    tagName = 'SubTree';
    // name holds the target tree ID for SubTree nodes
    attrs.push(`ID="${escapeXml(node.name ?? node.type)}"`);
  } else {
    tagName = node.type;
    if (node.name && node.name !== node.type) {
      attrs.push(`name="${escapeXml(node.name)}"`);
    }
  }

  Object.entries(node.ports).forEach(([k, v]) => {
    attrs.push(`${k}="${escapeXml(v)}"`);
  });

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

  if (node.children.length === 0) {
    return `${pad}<${tagName}${attrStr}/>`;
  }

  const childLines = node.children.map((c) => serializeNode(c, indent + 1, nodeModels)).join('\n');
  return `${pad}<${tagName}${attrStr}>\n${childLines}\n${pad}</${tagName}>`;
}

export function serializeXML(project: BTProject): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push(`<root BTCPP_format="4" main_tree_to_execute="${escapeXml(project.mainTreeId)}">`);

  project.trees.forEach((tree) => {
    lines.push(`  <BehaviorTree ID="${escapeXml(tree.id)}">`);
    lines.push(serializeNode(tree.root, 2, project.nodeModels));
    lines.push('  </BehaviorTree>');
  });

  // TreeNodesModel — only custom (non-builtin) nodes
  const builtinTypes = new Set(BUILTIN_NODES.map((n) => n.type));
  const customModels = project.nodeModels.filter((m) => !builtinTypes.has(m.type));

  if (customModels.length > 0) {
    lines.push('  <TreeNodesModel>');
    customModels.forEach((m) => {
      const cat = m.category === 'Leaf' ? 'Action' : m.category;
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
  const root: BTTreeNode = {
    id: 'n_root',
    type: 'Sequence',
    ports: {},
    children: [],
  };
  return {
    trees: [{ id: 'MainTree', root }],
    nodeModels: [...BUILTIN_NODES],
    mainTreeId: 'MainTree',
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

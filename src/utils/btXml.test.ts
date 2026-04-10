import { describe, expect, it } from 'vitest';
import { defaultProject, parseXML, SAMPLE_XML, serializeXML } from './btXml';

describe('parseXML', () => {
  it('parses sample XML and extracts trees and main tree id', () => {
    const project = parseXML(SAMPLE_XML);

    expect(project.mainTreeId).toBe('MainTree');
    expect(project.trees).toHaveLength(2);
    expect(project.trees[0].root.type).toBe('Sequence');

    const hasMoveToGoal = project.nodeModels.some((m) => m.type === 'MoveToGoal');
    const hasBuiltinSequence = project.nodeModels.some((m) => m.type === 'Sequence');
    expect(hasMoveToGoal).toBe(true);
    expect(hasBuiltinSequence).toBe(true);
  });

  it('throws when XML has no BehaviorTree', () => {
    const xml = '<?xml version="1.0"?><root BTCPP_format="4"></root>';
    expect(() => parseXML(xml)).toThrow('No <BehaviorTree> elements found in XML');
  });
});

describe('serializeXML', () => {
  it('serializes with escaped attributes and keeps custom models', () => {
    const project = defaultProject();
    project.mainTreeId = 'Main & Tree';
    project.trees[0].root.children.push({
      id: 'n1',
      type: 'Say',
      ports: { message: 'hello <world> & "team"' },
      children: [],
    });
    project.nodeModels.push({ type: 'Say', category: 'Action', ports: [] });

    const xml = serializeXML(project);

    expect(xml).toContain('main_tree_to_execute="Main &amp; Tree"');
    expect(xml).toContain('message="hello &lt;world&gt; &amp; &quot;team&quot;"');
    expect(xml).toContain('<Action ID="Say"/>');
  });

  it('supports parse -> serialize -> parse roundtrip for core fields', () => {
    const parsed = parseXML(SAMPLE_XML);
    const serialized = serializeXML(parsed);
    const reparsed = parseXML(serialized);

    expect(reparsed.mainTreeId).toBe(parsed.mainTreeId);
    expect(reparsed.trees).toHaveLength(parsed.trees.length);
    expect(reparsed.trees[0].root.type).toBe(parsed.trees[0].root.type);
  });
});

import { describe, expect, it } from 'vitest';
import { defaultProject, parseXML, SAMPLE_XML, serializeXML, isBlackboardRef, extractBlackboardKey, parseBlackboardExpression, isValidBlackboardKey, validatePortConnection, getPortDirectionLabel, validateNode, validateProject } from './btXml';

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

describe('Blackboard Expression Utilities', () => {
  describe('isBlackboardRef', () => {
    it('returns true for valid blackboard references', () => {
      expect(isBlackboardRef('{goal}')).toBe(true);
      expect(isBlackboardRef('{target_pose}')).toBe(true);
      expect(isBlackboardRef('{_private_var}')).toBe(true);
    });

    it('returns false for non-blackboard values', () => {
      expect(isBlackboardRef('hello')).toBe(false);
      expect(isBlackboardRef('{ }')).toBe(false);
      expect(isBlackboardRef('{}')).toBe(false);
      expect(isBlackboardRef('{')).toBe(false);
    });
  });

  describe('extractBlackboardKey', () => {
    it('extracts key from valid blackboard reference', () => {
      expect(extractBlackboardKey('{goal}')).toBe('goal');
      expect(extractBlackboardKey('{target_pose}')).toBe('target_pose');
      expect(extractBlackboardKey('{_private}')).toBe('_private');
    });

    it('returns null for invalid references', () => {
      expect(extractBlackboardKey('hello')).toBeNull();
      expect(extractBlackboardKey('{}')).toBeNull();
    });
  });

  describe('parseBlackboardExpression', () => {
    it('parses plain literal value', () => {
      expect(parseBlackboardExpression('hello world')).toEqual([
        { type: 'literal', value: 'hello world' }
      ]);
    });

    it('parses simple blackboard reference', () => {
      expect(parseBlackboardExpression('{goal}')).toEqual([
        { type: 'blackboard', value: 'goal' }
      ]);
    });

    it('parses mixed literal and blackboard', () => {
      expect(parseBlackboardExpression('Hello {name}, your score is {score}')).toEqual([
        { type: 'literal', value: 'Hello ' },
        { type: 'blackboard', value: 'name' },
        { type: 'literal', value: ', your score is ' },
        { type: 'blackboard', value: 'score' }
      ]);
    });
  });

  describe('isValidBlackboardKey', () => {
    it('validates correct identifiers', () => {
      expect(isValidBlackboardKey('goal')).toBe(true);
      expect(isValidBlackboardKey('target_pose')).toBe(true);
      expect(isValidBlackboardKey('_private')).toBe(true);
      expect(isValidBlackboardKey('var123')).toBe(true);
    });

    it('rejects invalid identifiers', () => {
      expect(isValidBlackboardKey('123var')).toBe(false);
      expect(isValidBlackboardKey('my-var')).toBe(false);
      expect(isValidBlackboardKey('')).toBe(false);
    });
  });

  describe('Port Type Validation', () => {
    it('validates output to input connection', () => {
      const result = validatePortConnection(
        { name: 'output', direction: 'output', type: 'int' },
        { name: 'input', direction: 'input', type: 'int' }
      );
      expect(result.valid).toBe(true);
    });

    it('rejects output to output connection', () => {
      const result = validatePortConnection(
        { name: 'out1', direction: 'output' },
        { name: 'out2', direction: 'output' }
      );
      expect(result.valid).toBe(false);
    });

    it('rejects input to input connection', () => {
      const result = validatePortConnection(
        { name: 'in1', direction: 'input' },
        { name: 'in2', direction: 'input' }
      );
      expect(result.valid).toBe(false);
    });

    it('rejects input as source', () => {
      const result = validatePortConnection(
        { name: 'in', direction: 'input' },
        { name: 'out', direction: 'output' }
      );
      expect(result.valid).toBe(false);
      expect(result.warning).toBe('Source port is an input');
    });

    it('rejects output as target', () => {
      // source is input (wrong!), target is output - should reject
      const result = validatePortConnection(
        { name: 'out', direction: 'input' },
        { name: 'in', direction: 'output' }
      );
      expect(result.valid).toBe(false);
      expect(result.warning).toBe('Source port is an input');
    });

    it('shows warning for type mismatch', () => {
      const result = validatePortConnection(
        { name: 'out', direction: 'output', type: 'int' },
        { name: 'in', direction: 'input', type: 'string' }
      );
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('Type mismatch');
    });

    it('allows matching types without warning', () => {
      const result = validatePortConnection(
        { name: 'out', direction: 'output', type: 'double' },
        { name: 'in', direction: 'input', type: 'double' }
      );
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('allows connection when either port has no type', () => {
      const result = validatePortConnection(
        { name: 'out', direction: 'output' },
        { name: 'in', direction: 'input', type: 'int' }
      );
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('allows inout ports to connect', () => {
      const result = validatePortConnection(
        { name: 'port', direction: 'inout', type: 'int' },
        { name: 'in', direction: 'input', type: 'int' }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('getPortDirectionLabel', () => {
    it('returns arrow for input', () => {
      expect(getPortDirectionLabel('input')).toBe('←');
    });
    it('returns arrow for output', () => {
      expect(getPortDirectionLabel('output')).toBe('→');
    });
    it('returns arrows for inout', () => {
      expect(getPortDirectionLabel('inout')).toBe('↔');
    });
  });

  describe('Node Model Validation', () => {
    it('validates node against model', () => {
      const node = {
        id: 'n1',
        type: 'MoveToGoal',
        ports: { goal: '{target_pose}' },
        children: [],
      };
      const issues = validateNode(node, [
        { type: 'MoveToGoal', category: 'Action', ports: [{ name: 'goal', direction: 'input' as const, required: true }] }
      ]);
      expect(issues).toHaveLength(0);
    });

    it('detects missing required port', () => {
      const node = {
        id: 'n1',
        type: 'MoveToGoal',
        ports: {},
        children: [],
      };
      const issues = validateNode(node, [
        { type: 'MoveToGoal', category: 'Action', ports: [{ name: 'goal', direction: 'input' as const, required: true }] }
      ]);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('Required port');
    });

    it('validates project with multiple trees', () => {
      const project = parseXML(SAMPLE_XML);
      const issues = validateProject(project);
      expect(issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });
  });
});

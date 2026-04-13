import { describe, expect, it } from 'vitest';
import { validateScriptExpression, validateConditionExpression } from './scriptExpressionParser';

describe('validateScriptExpression', () => {
  describe('valid expressions', () => {
    const valid = [
      // Blackboard references
      '{battery}',
      '{target_pose}',
      '{a.b.c}',
      '{_private}',
      '{var123}',
      // Comparison operators
      '{battery} > 20',
      '{a} < 100',
      '{x} >= 0',
      '{y} <= 1',
      '{name} == "hello"',
      '{active} != false',
      // Logical operators
      '{a} && {b}',
      '{a} || {b}',
      '!{a}',
      '!{a} && {b}',
      // Arithmetic
      '{x} + {y}',
      '{x} - 5',
      '{x} * 2',
      '{x} / 3',
      '-5',
      '{x} > 0 && !{y}',
      // Booleans
      'true',
      'false',
      'true == false',
      // Parentheses
      '({a} > 5)',
      '(({x} + {y}) * 2) > 10',
      // Complex
      '{a} && {b} || {c}',
      '{x} > 0 && !{y}',
      '{battery} > 20 && {status} == "ready"',
    ];

    valid.forEach((expr) => {
      it(`accepts: ${expr}`, () => {
        const result = validateScriptExpression(expr);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('invalid expressions', () => {
    it('rejects empty expression', () => {
      expect(validateScriptExpression('').valid).toBe(true);
    });

    it('rejects unclosed blackboard reference', () => {
      const result = validateScriptExpression('{unclosed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unclosed');
    });

    it('rejects blackboard key with hyphen', () => {
      const result = validateScriptExpression('{my-var}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid character');
    });

    it('rejects unknown identifier', () => {
      const result = validateScriptExpression('unknownWord');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown identifier');
    });

    it('rejects unterminated string', () => {
      const result = validateScriptExpression('"unclosed string');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unterminated');
    });

    it('rejects mismatched parentheses', () => {
      const result = validateScriptExpression('({a} > 5');
      expect(result.valid).toBe(false);
    });

    it('rejects consecutive operators', () => {
      const result = validateScriptExpression('{a} ++ {b}');
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateConditionExpression', () => {
  it('accepts empty string', () => {
    expect(validateConditionExpression('').valid).toBe(true);
  });

  it('accepts whitespace-only string', () => {
    expect(validateConditionExpression('   ').valid).toBe(true);
  });

  it('accepts valid condition', () => {
    const result = validateConditionExpression('{battery} > 20');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid condition', () => {
    const result = validateConditionExpression('{a &&}');
    expect(result.valid).toBe(false);
  });
});

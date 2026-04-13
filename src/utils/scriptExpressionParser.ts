/**
 * Lightweight BT.CPP script expression parser & validator.
 *
 * Supports the following expression syntax:
 * - Blackboard references: {key}, {a.b.c} (dot notation for nested properties)
 * - Comparison operators: ==, !=, >, <, >=, <=
 * - Logical operators: &&, ||, !
 * - Arithmetic operators: +, -, *, /
 * - Parentheses: ()
 * - Literals: numbers (42, 3.14), strings ("hello", 'hello'), booleans (true, false)
 * - Unary minus: -5
 *
 * A valid condition expression must evaluate to a boolean result.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorPosition?: number;
}

/**
 * Tokenize a BT.CPP script expression string.
 */
interface Token {
  type: 'identifier' | 'number' | 'string' | 'operator' | 'lparen' | 'rparen' | 'bang' | 'dot' | ' comparator' | 'eof';
  value: string;
  pos: number;
}

function isWhitespace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isAlpha(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isAlphaNumeric(c: string): boolean {
  return isAlpha(c) || isDigit(c);
}

const OPERATORS = new Set(['&&', '||', '==', '!=', '>=', '<=', '+', '-', '*', '/', '>', '<']);
const COMPARATORS = new Set(['==', '!=', '>=', '<=', '>', '<']);

function tokenize(expr: string): { tokens: Token[]; error?: string } {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const c = expr[i];

    if (isWhitespace(c)) {
      i++;
      continue;
    }

    // String literal
    if (c === '"' || c === "'") {
      const quote = c;
      let value = '';
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          value += expr[i + 1];
          i += 2;
        } else {
          value += expr[i];
          i++;
        }
      }
      if (i >= expr.length) {
        return { tokens, error: `Unterminated string literal at position ${i - value.length}` };
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value, pos: i - value.length - 2 });
      continue;
    }

    // Number literal
    if (isDigit(c) || (c === '.' && i + 1 < expr.length && isDigit(expr[i + 1]))) {
      let value = '';
      const start = i;
      while (i < expr.length && (isDigit(expr[i]) || expr[i] === '.')) {
        value += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value, pos: start });
      continue;
    }

    // Blackboard reference: {key} or {a.b.c}
    if (c === '{') {
      let value = '{';
      const start = i;
      i++;
      while (i < expr.length && expr[i] !== '}') {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          value += expr[i + 1];
          i += 2;
        } else {
          value += expr[i];
          i++;
        }
      }
      if (i >= expr.length) {
        return { tokens, error: `Unclosed blackboard reference starting at position ${start}` };
      }
      i++; // skip closing }
      value += '}';
      // Validate the key inside braces
      const inner = value.slice(1, -1);
      if (!inner) {
        return { tokens, error: `Empty blackboard reference at position ${start}` };
      }
      // Check for invalid characters in the key (allows a-z, A-Z, 0-9, _, .)
      for (let j = 0; j < inner.length; j++) {
        const ch = inner[j];
        if (!isAlphaNumeric(ch) && ch !== '_' && ch !== '.') {
          return {
            tokens,
            error: `Invalid character '${ch}' in blackboard key at position ${start + 1 + j}`,
          };
        }
      }
      tokens.push({ type: 'identifier', value, pos: start });
      continue;
    }

    // Two-character operators: &&, ||, ==, !=, >=, <=
    if (i + 1 < expr.length) {
      const two = expr.slice(i, i + 2);
      if (OPERATORS.has(two)) {
        tokens.push({ type: 'operator', value: two, pos: i });
        i += 2;
        continue;
      }
    }

    // Single-character operators
    if (OPERATORS.has(c)) {
      tokens.push({ type: 'operator', value: c, pos: i });
      i++;
      continue;
    }

    // Parentheses
    if (c === '(') {
      tokens.push({ type: 'lparen', value: c, pos: i });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', value: c, pos: i });
      i++;
      continue;
    }

    // Bang (negation)
    if (c === '!') {
      tokens.push({ type: 'bang', value: '!', pos: i });
      i++;
      continue;
    }

    // Dot (for property access like {a.b.c})
    if (c === '.') {
      tokens.push({ type: 'dot', value: '.', pos: i });
      i++;
      continue;
    }

    // Identifier (true/false)
    if (isAlpha(c)) {
      let value = '';
      const start = i;
      while (i < expr.length && isAlphaNumeric(expr[i])) {
        value += expr[i];
        i++;
      }
      if (value !== 'true' && value !== 'false') {
        return { tokens, error: `Unknown identifier '${value}' at position ${start}` };
      }
      tokens.push({ type: 'identifier', value, pos: start });
      continue;
    }

    return { tokens, error: `Unexpected character '${c}' at position ${i}` };
  }

  tokens.push({ type: 'eof', value: '', pos: expr.length });
  return { tokens };
}

/**
 * Validate a BT.CPP script expression.
 * Returns a ValidationResult: { valid: true } or { valid: false, error, errorPosition }.
 */
export function validateScriptExpression(expr: string): ValidationResult {
  if (!expr || !expr.trim()) {
    return { valid: true }; // Empty is valid (optional field)
  }

  const trimmed = expr.trim();

  const { tokens, error } = tokenize(trimmed);
  if (error) {
    return { valid: false, error, errorPosition: tokens[tokens.length - 1]?.pos ?? 0 };
  }

  // Parser state
  let pos = 0;

  function peek(): Token {
    return tokens[pos] ?? { type: 'eof', value: '', pos: trimmed.length };
  }

  function consume(): Token {
    return tokens[pos++];
  }

  // Grammar (top-down precedence):
  // expr      → lorExpr
  // lorExpr   → landExpr ('||' landExpr)*
  // landExpr  → eqExpr ('&&' eqExpr)*
  // eqExpr    → cmpExpr (('==' | '!=') cmpExpr)*
  // cmpExpr   → addExpr (('>' | '<' | '>=' | '<=') addExpr)*
  // addExpr   → mulExpr (('+' | '-') mulExpr)*
  // mulExpr   → unaryExpr (('*' | '/') unaryExpr)*
  // unaryExpr → '!'? primary
  // primary   → NUMBER | STRING | 'true' | 'false' | BLACKBOARD_REF | '(' expr ')'

  function parseLorExpr(): void {
    parseLandExpr();
    while (peek().type === 'operator' && peek().value === '||') {
      consume();
      parseLandExpr();
    }
  }

  function parseLandExpr(): void {
    parseEqExpr();
    while (peek().type === 'operator' && peek().value === '&&') {
      consume();
      parseEqExpr();
    }
  }

  function parseEqExpr(): void {
    parseCmpExpr();
    while (peek().type === 'operator' && (peek().value === '==' || peek().value === '!=')) {
      consume();
      parseCmpExpr();
    }
  }

  function parseCmpExpr(): void {
    parseAddExpr();
    while (peek().type === 'operator' && COMPARATORS.has(peek().value)) {
      consume();
      parseAddExpr();
    }
  }

  function parseAddExpr(): void {
    parseMulExpr();
    while (peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
      consume();
      parseMulExpr();
    }
  }

  function parseMulExpr(): void {
    parseUnaryExpr();
    while (peek().type === 'operator' && (peek().value === '*' || peek().value === '/')) {
      consume();
      parseUnaryExpr();
    }
  }

  function parseUnaryExpr(): void {
    // Handle ! (logical NOT)
    if (peek().type === 'bang' || (peek().type === 'operator' && peek().value === '!')) {
      consume();
      parseUnaryExpr();
      return;
    }
    // Handle unary minus (e.g. -5)
    if (peek().type === 'operator' && peek().value === '-') {
      consume();
      // After unary minus we expect a primary (number or parenthesized expr)
      const tok = peek();
      if (tok.type !== 'number' && tok.type !== 'lparen') {
        throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
      }
      parsePrimary();
      return;
    }
    parsePrimary();
  }

  function parsePrimary(): void {
    const tok = peek();

    if (tok.type === 'number' || tok.type === 'string' || (tok.type === 'identifier' && tok.value !== 'true' && tok.value !== 'false')) {
      consume();
      return;
    }

    if (tok.type === 'lparen') {
      consume();
      parseLorExpr();
      if (peek().type !== 'rparen') {
        throw new Error(`Expected ')' at position ${peek().pos}`);
      }
      consume();
      return;
    }

    // true / false boolean
    if (tok.type === 'identifier' && (tok.value === 'true' || tok.value === 'false')) {
      consume();
      return;
    }

    throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
  }

  try {
    parseLorExpr();
    if (peek().type !== 'eof') {
      return { valid: false, error: `Unexpected token '${peek().value}' at position ${peek().pos}`, errorPosition: peek().pos };
    }
  } catch (e) {
    return { valid: false, error: (e as Error).message, errorPosition: 0 };
  }

  return { valid: true };
}

/**
 * Validate a pre- or post-condition value.
 * Convenience wrapper around validateScriptExpression.
 */
export function validateConditionExpression(value: string): ValidationResult {
  if (!value || !value.trim()) {
    return { valid: true };
  }
  return validateScriptExpression(value.trim());
}

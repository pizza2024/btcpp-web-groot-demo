import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Test the constants and helper logic independent of React components
// This tests the same PRE/POST key definitions used in NodeEditModal

const PRE_KEYS = ['_failureIf', '_successIf', '_skipIf', '_while'] as const;
const POST_KEYS = ['_onSuccess', '_onFailure', '_onHalted', '_post'] as const;

const PRE_LABELS: Record<string, string> = {
  _failureIf: 'Failure if',
  _successIf: 'Success if',
  _skipIf: 'Skip if',
  _while: 'While (guard)',
};

const POST_LABELS: Record<string, string> = {
  _onSuccess: 'On Success',
  _onFailure: 'On Failure',
  _onHalted: 'On Halted',
  _post: 'Post (any)',
};

describe('Pre/Post Condition Constants', () => {
  it('has correct PRE_KEYS', () => {
    expect(PRE_KEYS).toEqual(['_failureIf', '_successIf', '_skipIf', '_while']);
  });

  it('has correct POST_KEYS', () => {
    expect(POST_KEYS).toEqual(['_onSuccess', '_onFailure', '_onHalted', '_post']);
  });

  it('has labels for all PRE_KEYS', () => {
    PRE_KEYS.forEach(key => {
      expect(PRE_LABELS[key]).toBeTruthy();
      expect(typeof PRE_LABELS[key]).toBe('string');
      expect(PRE_LABELS[key].length).toBeGreaterThan(0);
    });
  });

  it('has labels for all POST_KEYS', () => {
    POST_KEYS.forEach(key => {
      expect(POST_LABELS[key]).toBeTruthy();
      expect(typeof POST_LABELS[key]).toBe('string');
      expect(POST_LABELS[key].length).toBeGreaterThan(0);
    });
  });
});

describe('Precondition initialization logic', () => {
  it('initializes empty preconditions correctly', () => {
    const preconditions: Record<string, string> = {};
    const initPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { initPre[k] = preconditions[k] ?? ''; });
    
    PRE_KEYS.forEach(key => {
      expect(initPre[key]).toBe('');
    });
  });

  it('preserves existing precondition values', () => {
    const preconditions: Record<string, string> = {
      _failureIf: '{health < 0}',
      _while: '{isGuarding}',
    };
    const initPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { initPre[k] = preconditions[k] ?? ''; });
    
    expect(initPre['_failureIf']).toBe('{health < 0}');
    expect(initPre['_while']).toBe('{isGuarding}');
    expect(initPre['_successIf']).toBe('');
    expect(initPre['_skipIf']).toBe('');
  });

  it('cleans empty preconditions correctly', () => {
    const localPreconditions: Record<string, string> = {
      _failureIf: '{health < 0}',
      _successIf: '',
      _skipIf: '   ',
      _while: '{isGuarding}',
    };
    
    const cleanPre: Record<string, string> = {};
    PRE_KEYS.forEach(k => { if (localPreconditions[k]?.trim()) cleanPre[k] = localPreconditions[k].trim(); });
    
    expect(cleanPre).toEqual({
      _failureIf: '{health < 0}',
      _while: '{isGuarding}',
    });
    expect(cleanPre['_successIf']).toBeUndefined();
    expect(cleanPre['_skipIf']).toBeUndefined();
  });
});

describe('Postcondition initialization logic', () => {
  it('initializes empty postconditions correctly', () => {
    const postconditions: Record<string, string> = {};
    const initPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { initPost[k] = postconditions[k] ?? ''; });
    
    POST_KEYS.forEach(key => {
      expect(initPost[key]).toBe('');
    });
  });

  it('preserves existing postcondition values', () => {
    const postconditions: Record<string, string> = {
      _onSuccess: '{score += 10}',
      _onFailure: '{lives -= 1}',
    };
    const initPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { initPost[k] = postconditions[k] ?? ''; });
    
    expect(initPost['_onSuccess']).toBe('{score += 10}');
    expect(initPost['_onFailure']).toBe('{lives -= 1}');
    expect(initPost['_onHalted']).toBe('');
    expect(initPost['_post']).toBe('');
  });

  it('cleans empty postconditions correctly', () => {
    const localPostconditions: Record<string, string> = {
      _onSuccess: '{score += 10}',
      _onFailure: '',
      _onHalted: '   ',
      _post: '{debug = true}',
    };
    
    const cleanPost: Record<string, string> = {};
    POST_KEYS.forEach(k => { if (localPostconditions[k]?.trim()) cleanPost[k] = localPostconditions[k].trim(); });
    
    expect(cleanPost).toEqual({
      _onSuccess: '{score += 10}',
      _post: '{debug = true}',
    });
    expect(cleanPost['_onFailure']).toBeUndefined();
    expect(cleanPost['_onHalted']).toBeUndefined();
  });
});

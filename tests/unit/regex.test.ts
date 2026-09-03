import { describe, it, expect } from '@jest/globals';

describe('Regex literal fixes', () => {
  it('should match Hindi characters with the Devanagari regex', () => {
    const hindiRegex = /[\u0900-\u097F]/;
    expect(hindiRegex.test('नमस्ते')).toBe(true);
    expect(hindiRegex.test('Hello')).toBe(false);
  });

  it('should identify digits in short numeric questions, avoiding CONVERSATION fallback', () => {
    const query = 'F=5N, find a';
    const hasDigit = /\d/.test(query);
    expect(hasDigit).toBe(true);
    
    // Simulate the logic in solver-critic.ts
    const casualGreetings = ['hello', 'hi', 'hey'];
    const normalizedQuery = query.toLowerCase().trim();
    const isConversationFallback = casualGreetings.some(g => normalizedQuery.includes(g)) || 
      (normalizedQuery.length < 20 && !hasDigit);
      
    expect(isConversationFallback).toBe(false);
  });

  it('should ignore spaces with self-consistency fallback regex', () => {
    const clean = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    expect(clean('x = 5')).toBe('x=5');
    expect(clean('x  =   5')).toBe('x=5');
  });
});

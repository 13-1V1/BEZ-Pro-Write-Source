// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Scores must match samples worked out by hand with the formulas in the brief.

import { describe, expect, it } from 'vitest';
import { weightedTotal } from '../src/checks';
import type { Flag } from '../src/checks/types';
import { readingEase, readingLevel, readingMinutes, styleLevel, styleScore } from '../src/scores/scores';

describe('readability (Flesch Reading Ease)', () => {
  it('matches the hand calculation', () => {
    // 10 words, 2 sentences, 19 syllables (12 + 7):
    // Please(1) review(2) the(1) attached(2) document(3) carefully(3)
    // We(1) appreciate(4) your(1) help(1)
    // 206.835 − 1.015 × (10/2) − 84.6 × (19/10) = 41.02 → 41
    // (Avoid "cooperation": the syllable library counts it as 4, not 5.)
    const r = readingEase('Please review the attached document carefully. We appreciate your help.');
    expect(r.words).toBe(10);
    expect(r.sentences).toBe(2);
    expect(r.syllables).toBe(19);
    expect(r.score).toBe(41);
  });

  it('stays between 0 and 100', () => {
    expect(readingEase('The cat sat. It was warm.').score).toBe(100);
    expect(readingEase('').score).toBe(0);
  });

  it('colors by target: green at/above, yellow up to 10 under, red below that', () => {
    expect(readingLevel(60, 60).level).toBe('green');
    expect(readingLevel(50, 60).level).toBe('yellow');
    expect(readingLevel(49, 60).level).toBe('red');
  });
});

describe('style score', () => {
  it('matches the hand calculation: 100 − (3 ÷ 50 × 100) = 94', () => {
    const f = (c: Flag['c']): Flag => ({ c, check: 'x', sectionId: 'a', start: 0, end: 1, text: 'x' });
    const flags = [f('concise'), f('correct'), f('coherent')]; // weights 1 + 2 + 0
    expect(weightedTotal(flags)).toBe(3);
    expect(styleScore(weightedTotal(flags), 50)).toBe(94);
  });

  it('"missing" notes with no words to point at do not count', () => {
    const missing: Flag = { c: 'complete', check: 'missing-fact', sectionId: null, start: 0, end: 0, text: 'Unit 4B' };
    expect(weightedTotal([missing])).toBe(0);
  });

  it('never goes below 0 and colors at 80 / 60', () => {
    expect(styleScore(500, 10)).toBe(0);
    expect(styleLevel(80).level).toBe('green');
    expect(styleLevel(79).level).toBe('yellow');
    expect(styleLevel(59).level).toBe('red');
  });
});

describe('reading time', () => {
  it('is words ÷ 230, rounded up', () => {
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(231)).toBe(2);
  });
});

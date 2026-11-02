// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Progress across drafts: records update in place, trends compare recent vs earlier,
// and the focus is the C with the most spots per 100 words lately.

import { describe, expect, it } from 'vitest';
import { C_IDS, type CId } from '../src/checks/cs';
import { summarize, withRecord, type ProgressRecord } from '../src/progress/progress';

const spots = (over: Partial<Record<CId, number>> = {}) =>
  Object.fromEntries(C_IDS.map((c) => [c, over[c] ?? 0])) as Record<CId, number>;
const rec = (i: number, over: Partial<Record<CId, number>>, words = 100): ProgressRecord =>
  ({ draftId: `d${i}`, at: i, typeId: 'email', words, style: 80 + i, spots: spots(over) });

describe('progress', () => {
  it('finishing the same draft again replaces its record', () => {
    const a = withRecord([], rec(1, { concise: 3 }));
    const b = withRecord(a, { ...rec(1, { concise: 1 }), at: 5 });
    expect(b.length).toBe(1);
    expect(b[0].spots.concise).toBe(1);
  });

  it('with only a few pieces, trends are "new" and focus is the worst C', () => {
    const s = summarize([rec(1, { concrete: 4, clear: 1 }), rec(2, { concrete: 2 })]);
    expect(s.finished).toBe(2);
    expect(s.perC.every((p) => p.trend === 'new')).toBe(true);
    expect(s.focus).toBe('concrete');
  });

  it('compares the last 5 pieces with the 5 before', () => {
    const list = [
      ...[1, 2, 3, 4, 5].map((i) => rec(i, { concise: 5, courteous: 0 })),
      ...[6, 7, 8, 9, 10].map((i) => rec(i, { concise: 1, courteous: 3 })),
    ];
    const s = summarize(list);
    expect(s.perC.find((p) => p.c === 'concise')!.trend).toBe('better');
    expect(s.perC.find((p) => p.c === 'courteous')!.trend).toBe('worse');
    expect(s.perC.find((p) => p.c === 'clear')!.trend).toBe('same');
    expect(s.focus).toBe('courteous');
    expect(s.recentStyle).toBe(88);
  });

  it('counts spots per 100 words, so long pieces are not punished', () => {
    const s = summarize([rec(1, { clear: 4 }, 400), rec(2, { concise: 2 }, 100)]);
    expect(s.focus).toBe('concise');
  });

  it('one or two earlier pieces are not enough for a trend', () => {
    const list = [1, 2, 3, 4, 5, 6, 7].map((i) => rec(i, { concise: i < 3 ? 9 : 1 }));
    expect(summarize(list).perC.find((p) => p.c === 'concise')!.trend).toBe('new');
  });

  it('no spots at all means no focus', () => {
    expect(summarize([rec(1, {})]).focus).toBeNull();
  });
});

describe('damaged progress file', () => {
  it('skips wrong-shaped records instead of breaking the summary', async () => {
    const { cleanRecords } = await import('../src/progress/progress');
    const good = rec(1, { concise: 2 });
    const kept = cleanRecords([good, { ...good, draftId: 'b', spots: null }, { ...good, draftId: 'c', words: 'lots' }, { ...good, draftId: 'd', spots: { clear: 'x' } }, 5, null]);
    expect(kept.map((r) => r.draftId)).toEqual(['d1']);
    expect(() => summarize(kept)).not.toThrow();
  });

  it('fills missing C counts with 0', async () => {
    const { cleanRecords } = await import('../src/progress/progress');
    const [r] = cleanRecords([{ draftId: 'e', at: 1, typeId: 'email', words: 50, style: null, spots: { clear: 2 } }]);
    expect(r.spots.concise).toBe(0);
    expect(r.spots.clear).toBe(2);
  });
});

// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Practice mode: scenarios are valid, levels unlock, recommendations follow
// the learner's weakest C, and a practice draft never contains writing.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { C_IDS, type CId } from '../src/checks/cs';
import { practiceDraft, recommend, SCENARIOS, TO_UNLOCK, unlockedLevel } from '../src/practice/practice';
import type { ProgressRecord } from '../src/progress/progress';
import { validateType } from '../src/types/validate';

const types = new Map(readdirSync(new URL('../data/types/', import.meta.url)).map((f) => {
  const v = validateType(JSON.parse(readFileSync(new URL(`../data/types/${f}`, import.meta.url), 'utf8')));
  if (!v.ok) throw new Error(f);
  return [v.value.id, v.value];
}));
const zero = Object.fromEntries(C_IDS.map((c) => [c, 0])) as Record<CId, number>;
const done = (...ids: string[]): ProgressRecord[] =>
  ids.map((id, i) => ({ draftId: `d${i}`, at: i, typeId: 'email', practiceId: id, words: 100, style: 90, spots: zero }));

describe('practice scenarios', () => {
  it('16 scenarios, at least 4 per level, each pointing at a real type and topic', () => {
    expect(SCENARIOS.length).toBe(16);
    for (const level of [1, 2, 3]) expect(SCENARIOS.filter((s) => s.level === level).length).toBeGreaterThanOrEqual(4);
    for (const s of SCENARIOS) {
      const t = types.get(s.typeId);
      expect(t, s.id).toBeDefined();
      if (s.topicId) expect(t!.topics.some((x) => x.id === s.topicId), `${s.id} topic`).toBe(true);
    }
  });

  it(`level 2 opens after ${TO_UNLOCK} level-1 pieces, level 3 after ${TO_UNLOCK} level-2 pieces`, () => {
    expect(unlockedLevel([])).toBe(1);
    expect(unlockedLevel(done('heater'))).toBe(1);
    expect(unlockedLevel(done('heater', 'sick-day'))).toBe(2);
    expect(unlockedLevel(done('heater', 'sick-day', 'damaged-order', 'meeting-move'))).toBe(3);
  });

  it('recommends an unfinished scenario at the open level that works the weakest C', () => {
    expect(recommend([], 'courteous')!.id).toBe('thanks-interview');
    expect(recommend(done('heater', 'sick-day'), 'courteous')!.id).toBe('damaged-order');
    expect(recommend(done('heater', 'sick-day'), null)!.level).toBe(2);
  });

  it('a practice draft fills the plan only — no writing', () => {
    const d = practiceDraft(SCENARIOS[0]);
    expect(d.text).toEqual({});
    expect(d.parts).toEqual({});
    expect(d.prep.readerName).toBe(SCENARIOS[0].readerName);
    expect(d.practiceId).toBe(SCENARIOS[0].id);
    expect(d.stepKey).toBe('prep');
  });
});

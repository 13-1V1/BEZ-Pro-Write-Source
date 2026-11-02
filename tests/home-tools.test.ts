// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Home search and "start a new draft from this one".

import { describe, expect, it } from 'vitest';
import { normalizeDraft } from '../src/drafts/model';
import { copyAsNew } from '../src/drafts/reuse';
import { draftMatches } from '../src/drafts/search';

const old = normalizeDraft({
  id: 'old', title: 'Email · Request · Oct 29', typeId: 'email', topicId: 'request', profileId: 'p1',
  prep: { readerName: 'Ms. Alvarez', readerRole: 'Landlord', relationship: 'customer', goal: 'Get my lease', facts: 'Unit 4B', deadline: 'Nov 6' },
  text: { purpose: 'I need a copy of my lease.' }, checklist: { clear: { 0: 'yes' } }, stepKey: 'finish',
});

describe('copy as new', () => {
  const d = copyAsNew(old);
  it('keeps type, topic, sender, and plan', () => {
    expect([d.typeId, d.topicId, d.profileId]).toEqual(['email', 'request', 'p1']);
    expect(d.prep).toEqual(old.prep);
  });
  it('keeps none of the writing or answers, and starts at the plan', () => {
    expect(d.text).toEqual({});
    expect(d.checklist).toEqual({});
    expect(d.stepKey).toBe('prep');
    expect(d.id).not.toBe(old.id);
  });
  it('changing the copy\'s plan does not change the original', () => {
    d.prep.readerName = 'Mr. Lee';
    expect(old.prep.readerName).toBe('Ms. Alvarez');
  });
});

describe('search', () => {
  it('matches title, reader, and writing; every word must match', () => {
    expect(draftMatches(old, 'alvarez')).toBe(true);
    expect(draftMatches(old, 'lease request')).toBe(true);
    expect(draftMatches(old, 'lease memo')).toBe(false);
    expect(draftMatches(old, '  ')).toBe(true);
    expect(draftMatches(old, 'email', 'Email')).toBe(true);
  });
});

describe('checks the user turned off', () => {
  it('activeFlags drops only the switched-off checks', async () => {
    const { activeFlags } = await import('../src/checks');
    const f = (check: string) => ({ c: 'concise' as const, check, sectionId: 's', start: 0, end: 1, text: 'x' });
    const flags = [f('filler'), f('adverb'), f('wordy')];
    expect(activeFlags(flags, ['adverb']).map((x) => x.check)).toEqual(['filler', 'wordy']);
    expect(activeFlags(flags, [])).toBe(flags);
  });
});

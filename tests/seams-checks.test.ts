// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Checks and word lists (11/01/2026 seams review). Each failed on the code before the fix.

import { describe, expect, it, vi } from 'vitest';
import email from '../data/types/email.json';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import { passiveMatches } from '../src/checks/clear';
import { sentences } from '../src/checks/text';
import type { CheckInput, Flag } from '../src/checks/types';
import type { Prep } from '../src/drafts/model';
import type { Section } from '../src/types/schema';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';

const T = (() => { const v = validateType(email); if (!v.ok) throw new Error('bad type'); return v.value; })();
const blank: Prep = { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' };
const sec = (id: string) => T.sections.find((s) => s.id === id)!;

function run(text: Record<string, string>, prep: Partial<Prep> = {}, all: Section[] = T.sections): Flag[] {
  const input: CheckInput = {
    sections: all.filter((s) => text[s.id]).map((section) => ({ section, text: text[section.id] })),
    allSections: all, prep: { ...blank, ...prep }, lists: defaultLists(), relationships: relationships as never, spell: {},
  };
  return runChecks(input);
}
const lists = defaultLists();

describe('checks', () => {
  it('an empty "Passive verbs" list does not make every "is" passive', () => {
    expect(passiveMatches('The report is ready and I was going home.', lists.passiveHelpers, [])).toEqual([]);
  });

  it('"Drew Carter" is not read as already having a title', () => {
    const f = run({ greeting: 'Hi,' }, { readerName: 'Drew Carter' }).find((x) => x.check === 'greeting-name');
    expect(f?.use).toBe('Dear Mr./Ms./Dr. Carter,');
  });

  it('the informal-greeting highlight lands on the word even after leading spaces', () => {
    const text = '  Hey Sam,';
    const f = run({ greeting: text }, { readerName: 'Sam', relationship: 'boss' }).find((x) => x.check === 'greeting-informal')!;
    expect(text.slice(f.start, f.end)).toBe('Hey');
  });

  it('"4 p.m. Write…" ends a sentence; "3 p.m. Monday" does not', () => {
    expect(sentences('The fridge is cleared at 4 p.m. Write a memo.').length).toBe(2);
    expect(sentences('Send it by 3 p.m. Monday so I can read it.').length).toBe(1);
  });

  it('"Room B. Tell…" ends a sentence; "John F. Kennedy" does not', () => {
    expect(sentences('Meet in Conference Room B. Tell the team.').length).toBe(2);
    expect(sentences('We use Plan B. It is cheaper.').length).toBe(2);
    expect(sentences('Ask John F. Kennedy about it.').length).toBe(1);
  });

  it('"no." ends a sentence; "No. 5" does not', () => {
    expect(sentences('The answer is no. We will try again.').length).toBe(2);
    expect(sentences('Room No. 5 is open.').length).toBe(1);
  });

  it('a shouted run with a known acronym inside is still shouting, not an acronym', () => {
    const flags = run({ purpose: 'THE CEO SAID NO to the plan.' });
    expect(flags.some((f) => f.check === 'acronym' && f.text === 'THE')).toBe(false);
    expect(flags.some((f) => f.check === 'all-caps' && f.text === 'THE')).toBe(true);
  });

  it('an optional Ask left empty is not "missing"', () => {
    const all = T.sections.map((s) => (s.role === 'ask' ? { ...s, optional: true } : s));
    expect(run({ purpose: 'I am writing about the lease.' }, {}, all).some((f) => f.check === 'no-ask')).toBe(false);
  });

  it('a pasted greeting line is not the first paragraph, so the opening needs no linking word', () => {
    const own = { ...sec('purpose'), id: 'writing', role: 'body' as const };
    const flags = run({ writing: 'Hello Ms. Alvarez,\n\nI am writing about my lease.\n\nAlso, the heater is broken.' }, {}, [own]);
    expect(flags.some((f) => f.check === 'no-transition')).toBe(false);
  });

  it('a deadline written "November 6" matches a plan that says "Nov 6"', () => {
    const flags = run({ purpose: 'Please send the lease by Friday, November 6.' }, { deadline: 'Fri, Nov 6' });
    expect(flags.some((f) => f.check === 'missing-deadline')).toBe(false);
  });

  it('Home search finds a draft by a key fact from its plan', async () => {
    const { draftMatches } = await import('../src/drafts/search');
    const { newDraft } = await import('../src/drafts/model');
    const d = newDraft();
    d.prep.facts = 'Unit 4B';
    expect(draftMatches(d, '4b')).toBe(true);
  });

  it('standard sign-offs are not vague or filler', () => {
    for (const close of ['Many thanks,\nSam', 'Yours truly,\nSam']) {
      const flags = run({ closing: close }).filter((f) => f.sectionId === 'closing');
      expect(flags.map((f) => f.check)).not.toContain('vague');
      expect(flags.map((f) => f.check)).not.toContain('filler');
      expect(flags.map((f) => f.check)).not.toContain('adverb');
    }
  });
});

describe('word lists agree with each other', () => {
  const flagged = (text: string) => run({ purpose: `We will ${text} send it.` }).filter((f) => f.sectionId === 'purpose' && f.text.toLowerCase() === text.toLowerCase());

  it('no suggested replacement is flagged by another check', () => {
    for (const p of [...lists.simpler, ...lists.wordy]) {
      const words = p.use.replace(/\(.*\)/, '').trim();
      expect(flagged(words), `${p.word} -> ${p.use}`).toEqual([]);
    }
  });

  it('linking words are never flagged as adverbs or vague dates', () => {
    const bad = new Set([...lists.adverbs, ...lists['vague-dates']].map((w) => w.toLowerCase()));
    expect(lists.transitions.filter((w) => bad.has(w.toLowerCase()))).toEqual([]);
  });

  it('the adverb list has no duplicates and no words that carry meaning ("only", "quarterly")', () => {
    const lower = lists.adverbs.map((w) => w.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
    for (const w of ['only', 'quarterly', 'early', 'lonely']) expect(lower).not.toContain(w);
  });

  void sec;
});

describe('spelling cache', () => {
  it('a failed spell check is not cached as "no problems"', async () => {
    vi.resetModules();
    let fail = true;
    vi.doMock('../src/spell/harper', () => ({
      checkSpelling: async () => { if (fail) throw new Error('worker down'); return [{ start: 0, end: 4, message: 'x', kind: 'Spelling', suggestions: [] }]; },
    }));
    const cache = await import('../src/spell/cache');
    await expect(cache.spellingFor('teh cat')).rejects.toThrow();
    expect(cache.cachedSpelling('teh cat')).toBeUndefined();
    expect(cache.spellUnavailable()).toBe(true);
    fail = false;
    expect((await cache.spellingFor('teh cat')).length).toBe(1);
    vi.doUnmock('../src/spell/harper');
  });
});

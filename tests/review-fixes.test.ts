// Created by: Brennan Meyer with use of Claude Code 10/29/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Regression tests for the 10/29/2026 critic review: false alarms, damaged
// drafts, and draft names. Each failed on the code before the fix.

import { describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import type { CheckInput, Flag } from '../src/checks/types';
import { autoTitle, draftPreview } from '../src/drafts/drafts';
import { normalizeDraft } from '../src/drafts/model';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';

const T = (() => { const v = validateType(email); if (!v.ok) throw new Error('bad type'); return v.value; })();
const flagsOn = (purpose: string): Flag[] => {
  const input: CheckInput = {
    sections: [{ section: T.sections.find((s) => s.id === 'purpose')!, text: purpose }],
    allSections: T.sections,
    prep: { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' },
    lists: defaultLists(),
    relationships: relationships as never,
    spell: {},
  };
  return runChecks(input).filter((f) => f.sectionId === 'purpose');
};
const has = (flags: Flag[], check: string, text?: string) =>
  flags.some((f) => f.check === check && (text === undefined || f.text.toLowerCase() === text.toLowerCase()));

describe('P1: passive voice skips describing words', () => {
  for (const s of ['I was tired after the trip.', 'We are based in Valencia, CA.', 'Our team is excited to start.', 'I am interested in the role.', 'The office is located on Main Street.'])
    it(`"${s}" is not passive`, () => expect(has(flagsOn(s), 'passive')).toBe(false));

  it('real passive voice is still flagged', () => {
    expect(has(flagsOn('The form was submitted late.'), 'passive', 'was submitted')).toBe(true);
    expect(has(flagsOn('The report was written by Dana.'), 'passive', 'was written')).toBe(true);
  });

  it('describing words are an editable list', () => {
    expect(defaultLists()['passive-exceptions']).toContain('tired');
  });
});

describe('P1: abbreviations are not slang or a lowercase "i"', () => {
  it('"U.S." is not slang', () => expect(has(flagsOn('The U.S. office opens Monday.'), 'slang')).toBe(false));
  it('"i.e." is not a lowercase "i"', () => expect(has(flagsOn('Please see the form, i.e., the lease.'), 'lowercase-i')).toBe(false));
  it('"e.g." is fine too', () => expect(has(flagsOn('Bring an ID, e.g., a license.'), 'lowercase-i')).toBe(false));
  it('a lone "u" is still slang', () => expect(has(flagsOn('Can u send it?'), 'slang', 'u')).toBe(true));
  it('a lone lowercase "i" is still flagged', () => expect(has(flagsOn('Then i sent it.'), 'lowercase-i')).toBe(true));
});

describe('P2: adverb list', () => {
  it('"many" is not an adverb', () => expect(has(flagsOn('Thank you for the many hours.'), 'adverb')).toBe(false));
  it('"very" is still flagged as filler', () => expect(has(flagsOn('It was very late.'), 'filler', 'very')).toBe(true));
});

describe('P1: drafts get names you can tell apart', () => {
  it('auto title includes the time', () => {
    const a = normalizeDraft({ id: 'a', created: new Date(2026, 9, 29, 9, 5).getTime() });
    const b = normalizeDraft({ id: 'b', created: new Date(2026, 9, 29, 14, 40).getTime() });
    autoTitle(a, 'Email', 'General');
    autoTitle(b, 'Email', 'General');
    expect(a.title).not.toBe(b.title);
    expect(a.title).toContain('9:05');
  });

  it('a preview shows the first words written', () => {
    const d = normalizeDraft({ id: 'a', text: { subject: 'Lease copy needed', purpose: 'I am writing to ask for a copy of my lease by Friday, Nov 6, for my car loan.' } });
    expect(draftPreview(d, T.sections)).toBe('Lease copy needed');
    const e = normalizeDraft({ id: 'b', text: { purpose: 'I am writing to ask for a copy of my lease by Friday, Nov 6, for my car loan.' } });
    expect(draftPreview(e, T.sections)).toBe('I am writing to ask for a copy of my…') // first 10 words;
  });
});

describe('P2: damaged drafts load safely', () => {
  it('wrong-shaped fields become empty, so typing is kept', () => {
    const d = normalizeDraft({ id: 'x', text: 'oops', parts: [], checklist: 'x', skipped: 5, prep: null, stepKey: 12, title: 7 } as never);
    d.text.purpose = 'typing';
    expect(d.text.purpose).toBe('typing');
    (d.checklist.clear ??= {})[0] = 'yes';
    expect(d.checklist.clear[0]).toBe('yes');
    expect(Array.isArray(d.parts)).toBe(false);
    expect(d.stepKey).toBe('type');
    expect(typeof d.title).toBe('string');
    expect(d.prep.readerName).toBe('');
  });

  it('non-text section values are dropped', () => {
    const d = normalizeDraft({ id: 'x', text: { purpose: 'ok', details: 42, ask: null } } as never);
    expect(d.text).toEqual({ purpose: 'ok' });
  });
});

describe('Coherent hint skips sign-off and name lines', () => {
  it('"- B Meyer, General Manager" gets no linking-word hint', () => {
    const text = 'Thank you for telling us about the problem with your quote.\n\nWe will honor your original quote.\n\n- B Meyer, General Manager';
    const f = flagsOn(text).filter((x) => x.check === 'no-transition').map((x) => x.text);
    expect(f).toEqual(['We will honor your original quote.']);
  });
});

describe('"Your …" labels never double up', () => {
  it('works for every section name in every built-in type', async () => {
    const { yourLabel } = await import('../src/ui/your');
    expect(yourLabel('Your writing')).toBe('Your writing');
    expect(yourLabel('Your address')).toBe('Your address');
    expect(yourLabel('Greeting')).toBe('Your greeting');
    expect(yourLabel('Ask for interview', false)).toBe('Your Ask for interview');
    const { readdirSync, readFileSync } = await import('node:fs');
    for (const f of readdirSync(new URL('../data/types/', import.meta.url))) {
      const t = JSON.parse(readFileSync(new URL(`../data/types/${f}`, import.meta.url), 'utf8'));
      for (const s of t.sections) expect(yourLabel(s.label), `${f}/${s.id}`).not.toMatch(/^your your/i);
    }
  });
});

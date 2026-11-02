// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// False alarms found on a real test email (11/02/2026). Each one was flagged before the fix.

import { describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import { planPoints } from '../src/checks/complete';
import { mainWords } from '../src/checks/goal';
import { linkRanges } from '../src/checks/text';
import type { CheckInput, Flag } from '../src/checks/types';
import type { Prep } from '../src/drafts/model';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';

const T = (() => { const v = validateType(email); if (!v.ok) throw new Error('bad type'); return v.value; })();
const blank: Prep = { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' };

function input(text: Record<string, string>, prep: Partial<Prep> = {}): CheckInput {
  return {
    sections: T.sections.filter((s) => text[s.id]).map((section) => ({ section, text: text[section.id] })),
    allSections: T.sections, prep: { ...blank, ...prep }, lists: defaultLists(), relationships: relationships as never, spell: {},
  };
}
const run = (text: Record<string, string>, prep: Partial<Prep> = {}): Flag[] => runChecks(input(text, prep));

const details = 'My program is called B\'s E-Z Professional Writer or BEZ Pro Writer for short. It is free and safe to download and use. It can be found on my website below.\nhttps://13-1v1.github.io/BEZ-Works/';

describe('false alarms', () => {
  it('a web link on its own line needs no capital letter', () => {
    expect(run({ details }).filter((f) => f.check === 'capital-start')).toEqual([]);
  });

  it('an acronym is pointed at once, and never inside a web link', () => {
    const acr = run({ details }).filter((f) => f.check === 'acronym');
    expect(acr).toHaveLength(1);
    expect(acr[0].start).toBe(details.indexOf('BEZ'));
  });

  it('naming something ("is called") is not passive voice; "can be found" still is', () => {
    const passive = run({ details }).filter((f) => f.check === 'passive').map((f) => f.text);
    expect(passive).toEqual(['be found']);
  });

  it('a fact written in other words counts as found', () => {
    const facts = 'I posted it on my website.\nIt is free to download and use.\nShe inspired me to create it.';
    const text = { details, closing: 'Just so you know, you inspired this program and I thank you for that.' };
    expect(run(text, { facts }).filter((f) => f.check === 'missing-fact')).toEqual([]);
    const points = planPoints(input(text, { facts }));
    expect(points.filter((p) => p.kind === 'fact').map((p) => p.spot?.sectionId)).toEqual(['details', 'details', 'closing']);
  });

  it('a fact that really is missing is still flagged', () => {
    const flags = run({ details }, { facts: 'The deadline for comments is Friday.' }).filter((f) => f.check === 'missing-fact');
    expect(flags).toHaveLength(1);
  });

  it('a goal said in new words, near the start, is not "late"', () => {
    const goal = 'That I made a new program for writing professional writings and I wanted her opinion.';
    const purpose = "I'm writing to share my new program I created for writing and get your feedback.";
    expect(run({ purpose }, { goal }).filter((f) => f.check === 'goal-late')).toEqual([]);
  });

  it('plural and -ing forms share a stem, and "wanted" is a small word', () => {
    expect(mainWords('writings writing wanted')).toEqual(['writ']);
  });

  it('finds web links and email addresses, without the period after them', () => {
    expect(linkRanges('See www.bez.works. Or mail sam@shop.com.').map((r) => r.text)).toEqual(['www.bez.works', 'sam@shop.com']);
  });
});

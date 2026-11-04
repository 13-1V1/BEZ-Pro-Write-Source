// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Subject lines that mix capital styles, and the end-of-line spaces cut on export.

import { describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import memo from '../data/types/memo.json';
import relationships from '../data/relationships.json';
import { subjectCaps } from '../src/checks/subject';
import type { CheckInput } from '../src/checks/types';
import { CS } from '../src/checks/cs';
import { normalizeDraft, QUESTIONS_VERSION } from '../src/drafts/model';
import { tidyEnds } from '../src/export/assemble';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';

const typeOf = (raw: unknown) => { const v = validateType(raw); if (!v.ok) throw new Error('bad type'); return v.value; };
const EMAIL = typeOf(email);
const MEMO = typeOf(memo);

function flagged(type: ReturnType<typeof typeOf>, id: string, text: string, readerName = ''): string[] {
  const input: CheckInput = {
    sections: [{ section: type.sections.find((s) => s.id === id)!, text }], allSections: type.sections,
    prep: { readerName, readerRole: '', relationship: '', goal: '', facts: '', deadline: '' },
    lists: defaultLists(), relationships: relationships as never, spell: {},
  };
  return subjectCaps(input).map((f) => f.text);
}
const subject = (text: string) => flagged(EMAIL, 'subject', text);

describe('subject line capitals', () => {
  it('points at the lowercase main word in a mostly Title Case subject', () => {
    expect(subject('New Writing Program I wanted to Share')).toEqual(['wanted']);
  });

  it('leaves one style alone', () => {
    expect(subject('New Writing Program I Wanted to Share')).toEqual([]);
    expect(subject('New writing program I wanted to share')).toEqual([]);
  });

  it('days, months, names, numbers, and acronyms prove nothing', () => {
    expect(subject('Lease copy needed by Friday, Nov 6')).toEqual([]);
    expect(subject('Question about my Santa Clarita lease')).toEqual([]);
    expect(subject('BEZ Pro update for the team')).toEqual([]);
  });

  it('names in a sentence-case subject are not a mix (11/02/2026 review)', () => {
    expect(subject('Meeting with Dana Alvarez tomorrow')).toEqual([]);
    expect(subject('Question about Oak Ridge Apartments lease')).toEqual([]);
    expect(flagged(EMAIL, 'subject', 'Talk with Dana about the Budget Plan', 'Dana Alvarez')).toEqual([]);
  });

  it('accented words stay whole', () => {
    expect(subject('Café Meeting for the Résumé review Plan')).toEqual(['review']);
  });

  it('short words Title Case keeps lowercase are fine', () => {
    expect(subject('Notes From the Meeting about Next Steps')).toEqual([]);
  });

  it('checks a Subject line typed at the top of Check something I wrote', async () => {
    const own = typeOf((await import('../data/types/own.json')).default);
    const box = own.sections[0].id;
    expect(flagged(own, box, 'Subject: New Writing Program I wanted to Share\n\nHi Prof. Delaney,')).toEqual(['wanted']);
    expect(flagged(own, box, 'Hi Sam,\nRe: lunch Plans For the Team')).toEqual([]);
  });

  it('a label before a colon is its own run', () => {
    expect(subject('Meeting request: Budget Review, Monday')).toEqual([]);
  });

  it('finds the Subject line inside a memo heading', () => {
    expect(flagged(MEMO, 'heading', 'To: All Staff\nFrom: Jordan Reyes\nSubject: New Time Sheet deadline Rules')).toEqual(['deadline']);
    expect(flagged(MEMO, 'heading', 'To: All Front Desk Staff\nFrom: Jordan Reyes, Office Manager')).toEqual([]);
  });
});

describe('checklist questions', () => {
  it('every question is worded so "Yes" is the good answer', () => {
    for (const c of Object.values(CS)) for (const q of c.questions) expect(q).not.toMatch(/^(is there any|is anything|are there any|did you leave|do you use any)\b/i);
  });

  it('a draft from before the rewording drops only the answers whose meaning flipped', () => {
    const d = normalizeDraft({ checklist: { concise: { 0: 'yes', 1: 'no' }, courteous: { 0: 'yes', 1: 'no' }, clear: { 1: 'no' } } } as never);
    expect(d.checklist).toEqual({ concise: { 0: 'yes' }, courteous: { 0: 'yes' }, clear: { 1: 'no' } });
    expect(d.questions).toBe(QUESTIONS_VERSION);
    expect(normalizeDraft(d).checklist).toEqual(d.checklist);
    const now = normalizeDraft({ questions: QUESTIONS_VERSION, checklist: { courteous: { 1: 'no' } } } as never);
    expect(now.checklist).toEqual({ courteous: { 1: 'no' } });
  });
});

describe('export', () => {
  it('cuts spaces left at the end of a line, and nothing else', () => {
    expect(tidyEnds('try it straight from my site. \nhttps://x.com\t\n\nThank you.  ')).toBe('try it straight from my site.\nhttps://x.com\n\nThank you.');
    expect(tidyEnds('  Indented stays')).toBe('  Indented stays');
  });
});

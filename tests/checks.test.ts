// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Each C must flag the planted problems and stay quiet on clean samples
// (including clean address and signature lines).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import letter from '../data/types/letter.json';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import type { CheckInput, Flag } from '../src/checks/types';
import type { Prep } from '../src/drafts/model';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';
import type { WritingType } from '../src/types/schema';

function typeOf(raw: unknown): WritingType {
  const v = validateType(raw);
  if (!v.ok) throw new Error(v.problems.join('\n'));
  return v.value;
}

/** Sample files use "## sectionId" lines to split sections. */
function loadSample(name: string): Record<string, string> {
  const raw = readFileSync(new URL(`./samples/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const out: Record<string, string> = {};
  for (const block of raw.split(/^## /m).slice(1)) {
    const [id, ...rest] = block.split('\n');
    out[id.trim()] = rest.join('\n').trim();
  }
  return out;
}

const blankPrep: Prep = { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' };

function input(type: WritingType, text: Record<string, string>, prep: Partial<Prep> = {}): CheckInput {
  return {
    sections: type.sections.filter((s) => (text[s.id] ?? '').trim()).map((section) => ({ section, text: text[section.id] })),
    allSections: type.sections,
    prep: { ...blankPrep, ...prep },
    lists: defaultLists(),
    relationships: relationships as unknown as CheckInput['relationships'],
    spell: {},
  };
}

const show = (flags: Flag[]) => flags.map((f) => `${f.c}/${f.check} [${f.sectionId}] "${f.text}"`).join('\n');
const has = (flags: Flag[], check: string, text?: string) =>
  flags.some((f) => f.check === check && (text === undefined || f.text.toLowerCase() === text.toLowerCase()));

const EMAIL = typeOf(email);
const LETTER = typeOf(letter);

describe('clean samples', () => {
  it('clean email has no flags', () => {
    const flags = runChecks(input(EMAIL, loadSample('clean-email.txt'), {
      readerName: 'Ms. Alvarez', relationship: 'customer', facts: 'Unit 4B\nMarch 1, 2025', deadline: 'Friday, Nov 6',
    }));
    expect(show(flags)).toBe('');
  });

  it('clean business letter (with address and signature blocks) has no flags', () => {
    const flags = runChecks(input(LETTER, loadSample('clean-letter.txt'), {
      readerName: 'Dana Alvarez', relationship: 'stranger', facts: 'Unit 4B', deadline: 'Friday, Nov 6',
    }));
    expect(show(flags)).toBe('');
  });
});

describe('planted problems', () => {
  const flags = runChecks(input(EMAIL, loadSample('problems-email.txt'), {
    readerName: 'Ms. Alvarez', relationship: 'boss', facts: 'Unit 4B', deadline: 'Friday, Nov 6',
  }));
  const byC = (c: string) => flags.filter((f) => f.c === c);

  it('Clear', () => {
    expect(has(byC('clear'), 'long-sentence')).toBe(true);
    expect(has(byC('clear'), 'passive', 'was submitted')).toBe(true);
    expect(has(byC('clear'), 'jargon', 'circle back')).toBe(true);
    expect(has(byC('clear'), 'acronym', 'QXR')).toBe(true);
    expect(has(byC('clear'), 'simpler', 'utilize')).toBe(true);
    expect(byC('clear').find((f) => f.check === 'simpler')?.use).toBe('use');
  });

  it('Concise', () => {
    expect(has(byC('concise'), 'wordy', 'in order to')).toBe(true);
    expect(byC('concise').find((f) => f.check === 'wordy')?.use).toBe('to');
    expect(has(byC('concise'), 'filler', 'just')).toBe(true);
    expect(has(byC('concise'), 'filler', 'very')).toBe(true);
    // An adverb on its own isn't flagged; only next to a weak verb (tests/ideas.test.ts).
    expect(has(byC('concise'), 'adverb', 'quickly')).toBe(false);
  });

  it('Concrete', () => {
    expect(has(byC('concrete'), 'vague', 'stuff')).toBe(true);
    expect(has(byC('concrete'), 'vague-date', 'tomorrow')).toBe(true);
    expect(has(byC('concrete'), 'vague-date', 'later')).toBe(false); // "Later," is a sign-off
  });

  it('Correct', () => {
    expect(has(byC('correct'), 'slang', 'thx')).toBe(true);
    expect(has(byC('correct'), 'lowercase-i')).toBe(true);
    expect(has(byC('correct'), 'capital-start', 'read')).toBe(false); // subject is a header: no sentence checks
  });

  it('Coherent', () => {
    expect(has(byC('coherent'), 'no-transition')).toBe(true);
  });

  it('Complete', () => {
    expect(has(byC('complete'), 'missing-fact', 'Unit 4B')).toBe(true);
    expect(has(byC('complete'), 'missing-reader')).toBe(true);
    expect(has(byC('complete'), 'missing-deadline')).toBe(true);
    expect(has(byC('complete'), 'no-ask')).toBe(true);
  });

  it('Courteous', () => {
    expect(has(byC('courteous'), 'harsh', 'you must')).toBe(true);
    expect(has(byC('courteous'), 'harsh', 'immediately')).toBe(true);
    expect(has(byC('courteous'), 'all-caps', 'BROKEN')).toBe(true);
    expect(has(byC('courteous'), 'all-caps', 'AGAIN')).toBe(true);
    expect(has(byC('courteous'), 'exclamations')).toBe(true);
    expect(has(byC('courteous'), 'greeting-informal', 'hey')).toBe(true);
    expect(has(byC('courteous'), 'greeting-name')).toBe(true);
    expect(has(byC('courteous'), 'no-polite-close')).toBe(true);
  });

  it('ALL CAPS in the subject header is not a sentence check', () => {
    expect(flags.some((f) => f.check === 'all-caps' && f.sectionId === 'subject')).toBe(false);
  });
});

describe('rules from the brief', () => {
  it('acronym spelled out earlier as "Full Name (ABC)" is not flagged', () => {
    const t = { purpose: 'Please send it to Human Resources (HRD) today.', details: 'The HRD office closes at 5.' };
    const flags = runChecks(input(EMAIL, t));
    expect(has(flags, 'acronym', 'HRD')).toBe(false);
  });

  it('greeting on the no-name-OK list passes when there is no reader name', () => {
    const flags = runChecks(input(EMAIL, { greeting: 'Dear Hiring Manager,' }, { relationship: 'stranger' }));
    expect(flags.filter((f) => f.c === 'courteous' && f.check.startsWith('greeting'))).toEqual([]);
  });

  it('a type with no greeting or closing gets no greeting/closing flags', () => {
    const memo = { id: 'm', name: 'Memo', useWhen: 'x', sections: [
      { id: 'purpose', label: 'Purpose', role: 'body', tip: 't', good: 'g', bad: 'b' },
      { id: 'action', label: 'Action', role: 'ask', tip: 't', good: 'g', bad: 'b' },
    ] };
    const flags = runChecks(input(typeOf(memo), { purpose: 'Starting Monday, Nov 2, time sheets are due Friday.', action: 'Please submit yours by Friday, Oct 30.' }));
    expect(show(flags)).toBe('');
  });

  it('one word flagged twice in the same C counts once', () => {
    const flags = runChecks(input(EMAIL, { purpose: 'I really need it.' }));
    expect(flags.filter((f) => f.c === 'concise' && f.text === 'really').length).toBe(1);
  });
});

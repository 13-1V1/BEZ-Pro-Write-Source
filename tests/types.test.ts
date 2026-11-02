// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Every built-in type and topic loads, merges, and matches the brief's v1 list.
// Memo and Short Report (no greeting/closing) never get greeting/closing flags.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import type { CheckInput } from '../src/checks/types';
import { FRAMEWORKS } from '../src/frameworks/frameworks';
import { sectionsFor } from '../src/types/merge';
import type { WritingType } from '../src/types/schema';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';

const dir = new URL('../data/types/', import.meta.url);
const types: WritingType[] = readdirSync(dir).map((f) => {
  const v = validateType(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
  if (!v.ok) throw new Error(`${f}: ${v.problems.join('; ')}`);
  return v.value;
});
const byId = (id: string) => types.find((t) => t.id === id)!;

describe('v1 types and topics (brief §8)', () => {
  const expected: Record<string, { sections: string[]; topics: string[] }> = {
    email: { sections: ['header', 'greeting', 'body', 'body', 'ask', 'closing', 'signature'], topics: ['General', 'Request', 'Follow-up', 'Thank You', 'Asking a Teacher/Instructor', 'Calling Out Sick', 'Meeting Request'] },
    memo: { sections: ['header', 'body', 'body', 'body', 'ask'], topics: ['General', 'Policy Change', 'Meeting Notice', 'Announcement'] },
    letter: { sections: ['header', 'header', 'header', 'greeting', 'body', 'body', 'ask', 'closing', 'signature'], topics: ['General', 'Thank You', 'Apology', 'Complaint', 'Request', 'Resignation', 'Reference Request'] },
    'cover-letter': { sections: ['greeting', 'body', 'body', 'body', 'ask', 'closing', 'signature'], topics: ['General', 'Entry-Level', 'Career Change'] },
    report: { sections: ['header', 'body', 'body', 'body', 'ask'], topics: ['General', 'Incident Report', 'Progress Report'] },
    other: { sections: ['greeting', 'body', 'body', 'ask', 'closing'], topics: [] },
  };
  for (const [id, want] of Object.entries(expected)) {
    it(`${id}: sections and topics match`, () => {
      const t = byId(id);
      expect(t.sections.map((s) => s.role)).toEqual(want.sections);
      expect(t.topics.map((x) => x.name)).toEqual(want.topics);
    });
  }

  it('Something Else has an optional greeting', () => {
    expect(byId('other').sections[0].optional).toBe(true);
  });

  it('every topic merges and every framework it uses exists', () => {
    for (const t of types)
      for (const topic of [undefined, ...t.topics]) {
        const sections = sectionsFor(t, topic);
        expect(sections.length).toBe(t.sections.length);
        for (const s of sections) if (s.framework) expect(FRAMEWORKS[s.framework], `${t.id}/${topic?.id}/${s.id}`).toBeDefined();
      }
  });

  it('every topic has do\'s, don\'ts, a tone, and phrase ideas somewhere', () => {
    for (const t of types)
      for (const topic of t.topics) {
        expect(topic.dos.length, `${t.id}/${topic.id}`).toBeGreaterThan(0);
        expect(topic.donts.length, `${t.id}/${topic.id}`).toBeGreaterThan(0);
        expect(topic.tone.length).toBeGreaterThan(0);
        expect(sectionsFor(t, topic).some((s) => s.phrases.length > 0 || s.framework)).toBe(true);
      }
  });
});

describe('types without a greeting or closing', () => {
  const input = (t: WritingType, text: Record<string, string>): CheckInput => ({
    sections: t.sections.filter((s) => text[s.id]).map((section) => ({ section, text: text[section.id] })),
    allSections: t.sections,
    prep: { readerName: 'Dana Alvarez', readerRole: '', relationship: 'boss', goal: '', facts: '', deadline: '' },
    lists: defaultLists(),
    relationships: relationships as never,
    spell: {},
  });
  const noGreetClose = (flags: ReturnType<typeof runChecks>) =>
    flags.filter((f) => f.check.startsWith('greeting') || f.check === 'no-polite-close');

  it('Memo runs with no greeting/closing flags', () => {
    const t = byId('memo');
    const flags = runChecks(input(t, {
      heading: 'To: Dana Alvarez\nFrom: Jordan Reyes\nDate: October 28, 2026\nSubject: New time sheet deadline',
      purpose: 'Starting Monday, Nov 2, all time sheets are due by 5 p.m. Friday.',
      details: 'Submit time sheets in the Payroll app.',
      action: 'Please submit this week\'s time sheet by Friday, Oct 30.',
    }));
    expect(noGreetClose(flags)).toEqual([]);
  });

  it('Short Report runs with no greeting/closing flags', () => {
    const t = byId('report');
    const flags = runChecks(input(t, {
      title: 'Parking Lot Lighting Review\nOctober 28, 2026\nPrepared by Jordan Reyes',
      summary: 'Three of the eight lights are out. We recommend replacing all eight by Nov 20.',
      background: 'Dana Alvarez asked for a lighting check on Oct 15.',
      findings: 'Lights 2, 5, and 7 do not turn on.',
      recommendation: 'We recommend replacing all eight lights with LED fixtures by Nov 20.',
    }));
    expect(noGreetClose(flags)).toEqual([]);
  });
});

// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Fact guard (numbers against the Plan, weekdays against dates), the two tone
// notes, and finding the right framework box for a spot.

import { describe, expect, it } from 'vitest';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import { factSpot } from '../src/checks/complete';
import { nearMiss, numbersWritten } from '../src/checks/facts';
import type { Flag } from '../src/checks/types';
import type { Prep } from '../src/drafts/model';
import { joinParts, partSpot, type Framework } from '../src/frameworks/frameworks';
import type { Section } from '../src/types/schema';
import { defaultLists } from '../src/wordlists/load';

const body: Section = { id: 'b', label: 'Body', role: 'body', optional: false, tip: '', good: '', bad: '', targetWords: [0, 9999], phrases: [], profileFields: [] };
const NOV_2026 = Date.UTC(2026, 10, 4);
const input = (text: string, prep: Partial<Prep> = {}, now: number | undefined = NOV_2026) => ({
  sections: [{ section: body, text }], allSections: [body], lists: defaultLists(), relationships: relationships as never, spell: {}, now,
  prep: { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '', ...prep } as unknown as Prep,
});
const found = (check: string, text: string, prep?: Partial<Prep>, now?: number): Flag[] => runChecks(input(text, prep, now)).filter((f) => f.check === check);

describe('numbers against the Plan', () => {
  it('points at a number one digit off, and says what the Plan has', () => {
    const [f] = found('plan-number', 'My order is 4417 and it never came.', { facts: 'Order #4471' });
    expect(f.text).toBe('4417');
    expect(f.detail).toBe('Your Plan says 4471.');
  });

  it('stays quiet when the Plan number is written too, or the numbers are just different', () => {
    expect(found('plan-number', 'Order 4471 replaced order 4417.', { facts: 'Order #4471' })).toEqual([]);
    expect(found('plan-number', 'It cost 9000.', { facts: 'Order #4471' })).toEqual([]);
  });

  it('leaves short numbers and years alone', () => {
    expect(found('plan-number', 'Room 21 in 2025.', { facts: 'Room 12 in 2026' })).toEqual([]);
  });

  it('knows a near miss', () => {
    expect(nearMiss('4471', '4417')).toBe(true);
    expect(nearMiss('4471', '4481')).toBe(true);
    expect(nearMiss('4471', '471')).toBe(false);
    expect(nearMiss('44715', '4715')).toBe(true);
    expect(nearMiss('4471', '7144')).toBe(false);
  });

  it('a fact with a number needs the number, but not its year or ":00"', () => {
    const fact = (f: string, text: string) => factSpot(f, input(text));
    expect(fact('Order #4471', 'My order never came.')).toBeNull();
    expect(fact('Order #4471', 'My order 4471 never came.')).not.toBeNull();
    expect(numbersWritten('Friday, Nov 6, 2026', 'See you Friday, Nov 6.')).toBe(true);
    expect(numbersWritten('Starts at 3:00', 'It starts at 3.')).toBe(true);
    expect(numbersWritten('$1,200.00', 'It costs $1200.')).toBe(true);
    expect(numbersWritten('2 weeks off', 'I need two weeks off.')).toBe(true);
  });
});

describe('weekdays against dates', () => {
  it('points at a day that does not fit, and names the right one', () => {
    const [f] = found('weekday-date', 'Can we meet Monday, Nov 6?');
    expect(f.text).toBe('Monday, Nov 6');
    expect(f.detail).toBe('November 6, 2026 is a Friday.');
  });

  it('passes a day that fits, in every way people write it', () => {
    for (const t of ['Friday, Nov 6', 'Fri, Nov 6', 'friday november 6th', 'Friday 11/6', 'Friday, 11/6/2026', 'Friday, Nov 6, 2026', 'Fri. Nov. 6'])
      expect(found('weekday-date', `Due ${t}.`), t).toEqual([]);
  });

  it('uses a year when one is written', () => {
    expect(found('weekday-date', 'Due Friday, Nov 6, 2027.')[0].detail).toBe('November 6, 2027 is a Saturday.');
  });

  it('a date with no year means the nearest one', () => {
    expect(found('weekday-date', 'Due Friday, Jan 1.')).toEqual([]);
    expect(found('weekday-date', 'Due Friday, Jan 1.', {}, Date.UTC(2026, 1, 1))[0].detail).toBe('January 1, 2026 is a Thursday.');
  });

  it('points at a date that does not exist', () => {
    expect(found('weekday-date', 'Due Monday, Feb 30.')[0].detail).toContain('February');
  });

  it('leaves plain words and drafts with no date to go on alone', () => {
    expect(found('weekday-date', 'I sat nov 6 hours.')).toEqual([]);
    const noDate = { ...input('Can we meet Monday, Nov 6?'), now: undefined };
    expect(runChecks(noDate).filter((f) => f.check === 'weekday-date')).toEqual([]);
  });
});

describe('tone notes', () => {
  it('points at phrases that sound unsure', () => {
    expect(found('unsure', 'I think the report is late. Does that make sense?').map((f) => f.text.toLowerCase())).toEqual(['i think', 'does that make sense']);
  });

  it('an apology is not flagged for saying sorry', () => {
    expect(found('unsure', "I'm sorry for the late reply.")).toEqual([]);
  });

  it('notes a piece that is mostly about the writer, and says how much', () => {
    const [f] = found('reader-side', 'I went. I saw it. My car broke. I called. I waited. I left. I ran. The bus came.');
    expect(f.end).toBe(f.start);
    expect(f.detail).toBe('7 of your 8 sentences start with "I" or "My".');
  });

  it('stays quiet on a short piece or a balanced one', () => {
    expect(found('reader-side', 'I went. I saw it.')).toEqual([]);
    expect(found('reader-side', 'I went. Your car broke. The bus came. It rained. We waited.')).toEqual([]);
  });
});

describe('finding the box for a spot', () => {
  const fw = { parts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } as unknown as Framework;
  const answers = { a: 'First part.', b: '  Second part here. ', c: 'Third.' };

  it('maps a spot in the joined text back to its box', () => {
    const joined = joinParts(fw, answers);
    for (const [word, part] of [['First', 'a'], ['Second', 'b'], ['here', 'b'], ['Third', 'c']]) {
      const start = joined.indexOf(word);
      const at = partSpot(fw, answers, start, start + word.length)!;
      expect(at.partId).toBe(part);
      expect(answers[part as 'a'].slice(at.start, at.end)).toBe(word);
    }
  });

  it('skips empty boxes', () => {
    const a = { a: '', b: 'Only this.', c: '' };
    expect(partSpot(fw, a, 5, 9)).toEqual({ partId: 'b', start: 5, end: 9 });
  });
});

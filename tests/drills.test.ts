// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// @vitest-environment happy-dom
// Two-minute drills, teaching the app from a check row, and sending an email's
// subject and message apart.

import { beforeEach, describe, expect, it } from 'vitest';
import type { Flag } from '../src/checks/types';
import type { Draft } from '../src/drafts/model';
import { newDraft } from '../src/drafts/model';
import { ownWritingDraft } from '../src/drafts/reuse';
import { splitSubject } from '../src/export/assemble';
import { mailtoLink } from '../src/export/email-app';
import { DRILL_SETS, doneIn, drillClear, drillId, drillSpots, loadDoneDrills, nextLine, recommendSet, saveDoneDrills, spotRows } from '../src/practice/drills';
import { listsWith, withoutWord } from '../src/screens/teach';
import { damagedFiles } from '../src/storage/store';
import type { Section } from '../src/types/schema';
import { defaultLists } from '../src/wordlists/load';

const lists = defaultLists();
beforeEach(() => { localStorage.clear(); damagedFiles.clear(); });

describe('drills', () => {
  it('every line has a spot in its own C, so there is something to clear', () => {
    for (const set of DRILL_SETS) for (const line of set.lines)
      expect(drillSpots(line, lists).some((f) => f.c === set.c), line).toBe(true);
  });

  it('ticks spots off as they go, and counts new ones', () => {
    const line = 'I really need it soon.';
    const start = drillSpots(line, lists);
    expect(spotRows(start, start).every((r) => !r.cleared)).toBe(true);
    const rows = spotRows(start, drillSpots('I need it soon.', lists));
    expect(rows.find((r) => r.label.includes('really'))?.cleared).toBe(true);
    expect(rows.find((r) => r.label.includes('soon'))?.cleared).toBe(false);
    const worse = spotRows(start, drillSpots('I need it basically by Friday, Nov 6.', lists));
    expect(worse.find((r) => r.label.includes('basically'))?.cleared).toBe(false);
  });

  it('a clean rewrite passes, but an empty box or the same line does not', () => {
    const line = 'I really need it soon.';
    const start = drillSpots(line, lists);
    const rows = (t: string) => spotRows(start, drillSpots(t, lists));
    expect(drillClear(rows('I need it by Friday, Nov 6.'), 'I need it by Friday, Nov 6.', line)).toBe(true);
    expect(drillClear(rows(''), '', line)).toBe(false);
    expect(drillClear(rows(line), line, line)).toBe(false);
  });

  it('a check the user turned off is not a spot', () => {
    expect(drillSpots('I really need it.', lists, ['filler']).some((f) => f.check === 'filler')).toBe(false);
  });

  it('remembers finished drills and picks up at the next one', async () => {
    const [set] = DRILL_SETS;
    await saveDoneDrills(new Set([drillId(set, 0), drillId(set, 1)]));
    const done = await loadDoneDrills();
    expect(doneIn(set, done)).toBe(2);
    expect(nextLine(set, done)).toBe(2);
  });

  it('recommends the set for the focus C, then the first with drills left', () => {
    expect(recommendSet(new Set(), 'courteous')?.c).toBe('courteous');
    expect(recommendSet(new Set(), 'correct')?.id).toBe(DRILL_SETS[0].id);
    const all = new Set(DRILL_SETS[2].lines.map((_, i) => drillId(DRILL_SETS[2], i)));
    expect(recommendSet(all, 'courteous')?.id).toBe(DRILL_SETS[0].id);
  });
});

describe('teaching the app', () => {
  const spot = (check: string, text: string) => ({ c: 'concise', check, sectionId: 'b', start: 0, end: text.length, text }) as Flag;

  it('finds every list that would point at a spot, whatever its capitals', () => {
    expect(listsWith(spot('filler', 'Really'), lists).sort()).toEqual(['adverbs', 'filler']);
    expect(listsWith(spot('vague-date', 'soon'), lists)).toEqual(['vague-dates']);
    expect(listsWith(spot('wordy', 'in order to'), lists)).toEqual(['wordy']);
  });

  it('offers nothing for a spot that has no list', () => {
    expect(listsWith(spot('long-sentence', 'A long one'), lists)).toEqual([]);
    expect(listsWith(spot('filler', 'not on the list'), lists)).toEqual([]);
  });

  it('takes a word off a plain list or a pair list', () => {
    expect(withoutWord(['very', 'really'], 'Really')).toEqual(['very']);
    expect(withoutWord([{ word: 'in order to', use: 'to' }], 'in order to')).toEqual([]);
  });

  it('My dictionary starts empty and is an editable list', () => {
    expect(lists['my-words']).toEqual([]);
  });
});

describe('subject and message apart', () => {
  const sections = [
    { id: 'subject', role: 'header', prefix: 'Subject: ', gapBefore: 0 },
    { id: 'greeting', role: 'greeting' },
    { id: 'body', role: 'body' },
  ] as unknown as Section[];
  const draft = (text: Record<string, string>) => ({ ...newDraft(), text } as Draft);

  it('splits the subject from everything else', () => {
    expect(splitSubject(draft({ subject: 'Lease copy', greeting: 'Hello Ms. Alvarez,', body: 'Please send it.' }), sections))
      .toEqual({ subject: 'Lease copy', message: 'Hello Ms. Alvarez,\n\nPlease send it.' });
  });

  it('has nothing to split without a subject line', () => {
    expect(splitSubject(draft({ greeting: 'Hi,' }), sections)).toBeNull();
  });

  it('builds a mailto link that keeps line breaks and odd characters', () => {
    expect(mailtoLink('Q&A today', 'Line one\nLine two')).toBe('mailto:?subject=Q%26A%20today&body=Line%20one%0D%0ALine%20two');
    expect(mailtoLink('Subject only', '')).toBe('mailto:?subject=Subject%20only');
  });

  it('Check what I copied opens the box with that text', () => {
    expect(ownWritingDraft('My words.').text.writing).toBe('My words.');
    expect(ownWritingDraft().text.writing).toBeUndefined();
  });
});

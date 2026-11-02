// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The 11/01/2026 ideas: check order, "This one's fine", focused adverbs,
// the goal note, and the other picks that can be tested without a window.

import { describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import { buildSteps } from '../src/flow/steps';
import { validateType } from '../src/types/validate';

const T = (() => { const v = validateType(email); if (!v.ok) throw new Error('bad type'); return v.value; })();

describe("This one's fine", () => {
  it('a spot marked fine stays in the list but stops counting, even after other text moves', async () => {
    const { flagKey, markFine, weightedTotal } = await import('../src/checks');
    const flag = { c: 'concise' as const, check: 'filler', sectionId: 'purpose', start: 10, end: 16, text: 'really' };
    const moved = { ...flag, start: 40, end: 46 };
    const marked = markFine([moved], [flagKey(flag)]);
    expect(marked).toHaveLength(1);
    expect(marked[0].fine).toBe(true);
    expect(weightedTotal(marked)).toBe(0);
    expect(weightedTotal([moved])).toBe(1);
  });

  it('old drafts with no list load with an empty one', async () => {
    const { normalizeDraft } = await import('../src/drafts/model');
    expect(normalizeDraft({ id: 'x' }).fine).toEqual([]);
    expect(normalizeDraft({ id: 'x', fine: 'oops' as never }).fine).toEqual([]);
  });
});

describe('focused adverb check', () => {
  it('flags an -ly word next to a weak verb, not every -ly word', async () => {
    const { runChecks } = await import('../src/checks');
    const { defaultLists } = await import('../src/wordlists/load');
    const relationships = (await import('../data/relationships.json')).default;
    const purpose = T.sections.find((s) => s.id === 'purpose')!;
    const adverbs = (text: string) =>
      runChecks({ sections: [{ section: purpose, text }], allSections: T.sections, lists: defaultLists(), relationships: relationships as never, spell: {},
        prep: { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' } }).filter((f) => f.check === 'adverb').map((f) => f.text);
    expect(adverbs('I walked quickly to the office.')).toEqual(['quickly']);
    expect(adverbs('She said it loudly.')).toEqual(['loudly']);
    expect(adverbs('We meet monthly to review the budget.')).toEqual([]);
    expect(adverbs('Unfortunately, the order is late.')).toEqual([]);
  });
});

describe('Save a copy I can edit', () => {
  it('writes a type file the app loads back, under a new id', async () => {
    const { freeId, typeFileFor } = await import('../src/screens/settings/types');
    const copy = JSON.parse(JSON.stringify(typeFileFor({ ...T, source: 'built-in', file: 'email.json' }, 'email-copy')));
    expect(copy.source).toBeUndefined();
    const v = validateType(copy);
    expect(v.ok).toBe(true);
    expect(v.ok && v.value.name).toBe('Email (my copy)');
    expect(freeId('email', new Set(['email', 'email-copy']))).toBe('email-copy-2');
  });
});

describe('goal check', () => {
  const late = async (goal: string, purpose: string) => {
    const { goalLate } = await import('../src/checks/goal');
    const sec = T.sections.find((s) => s.id === 'purpose')!;
    return goalLate({ sections: [{ section: sec, text: purpose }], allSections: T.sections, lists: {} as never, relationships: {}, spell: {},
      prep: { readerName: '', readerRole: '', relationship: '', goal, facts: '', deadline: '' } }).length > 0;
  };
  it('notes a goal that is missing from the first two sentences', async () => {
    expect(await late('Email me a copy of my lease', 'I hope you are well. The weather has been nice. Could you email a copy of my lease?')).toBe(true);
  });
  it('is quiet when the opening says it, in other word forms too', async () => {
    expect(await late('Get the heater fixed this week', 'I am writing to ask you to fix the heater in Unit 4B.')).toBe(false);
    expect(await late('', 'Anything at all.')).toBe(false);
  });
});

describe('check order', () => {
  const checks = (focus?: Parameters<typeof buildSteps>[3]) =>
    buildSteps(T, T.sections, 0, focus).filter((s) => s.stage === 'check').map((s) => s.cId);

  it('big issues come first, spelling last', () => {
    expect(checks()).toEqual(['complete', 'clear', 'coherent', 'courteous', 'concise', 'concrete', 'correct']);
  });

  it("a practice scenario's focus C comes first", () => {
    expect(checks('concrete')[0]).toBe('concrete');
    expect(checks('concrete')).toHaveLength(7);
  });
});

describe('What I changed', () => {
  it('marks added and removed words, and the pieces join back into each version', async () => {
    const { diffWords } = await import('../src/drafts/diff');
    const before = 'Hey, I just need the lease soon.';
    const after = 'Hello Ms. Alvarez, I need the lease by Friday, Nov 6.';
    const changes = diffWords(before, after);
    expect(changes.filter((c) => c.kind !== 'removed').map((c) => c.text).join('')).toBe(after);
    expect(changes.filter((c) => c.kind !== 'added').map((c) => c.text).join('')).toBe(before);
    expect(changes.some((c) => c.kind === 'removed' && c.text.includes('just'))).toBe(true);
    expect(changes.some((c) => c.kind === 'added' && c.text.includes('Friday'))).toBe(true);
  });
});

describe('Check something I wrote: open a file', () => {
  it("reads back a Word file's text, one paragraph per line", async () => {
    const { toDocx } = await import('../src/export/docx');
    const { docxText } = await import('../src/export/open-file');
    const bytes = await toDocx('Hello Ms. Alvarez,\n\nCould you send my lease by Friday, Nov 6?', 'Lease');
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    expect(await docxText(buffer)).toBe('Hello Ms. Alvarez,\n\nCould you send my lease by Friday, Nov 6?');
  });

  it('says what to do with a file it can\'t read', async () => {
    const { readPicked } = await import('../src/export/open-file');
    const r = await readPicked(new File(['%PDF'], 'letter.pdf', { type: 'application/pdf' }));
    expect(r && !r.ok && r.message).toContain('copy the text and paste it here');
  });
});

describe('Check something I wrote: which paragraph is which', () => {
  it('runs the Ask and closing checks on the marked paragraphs, pointing into the one box', async () => {
    const own = (await import('../data/types/own.json')).default;
    const v = validateType(own);
    if (!v.ok) throw new Error('bad type');
    const { taggedSections, backToBox } = await import('../src/checks/tagged');
    const { runChecks } = await import('../src/checks');
    const { defaultLists } = await import('../src/wordlists/load');
    const box = v.value.sections[0];
    const text = 'Hello Ms. Alvarez,\n\nThe heater in Unit 4B is broken.\n\nIt is cold.\n\nSam';
    const { sections, all } = taggedSections(box, text, { '2': 'ask', '3': 'closing' });
    const flags = backToBox(runChecks({ sections, allSections: all, lists: defaultLists(), relationships: {}, spell: {},
      prep: { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' } }), box.id, sections);
    const noAsk = flags.find((f) => f.check === 'no-ask')!;
    expect(noAsk.sectionId).toBe(box.id);
    expect(text.slice(noAsk.start, noAsk.end)).toBe('It is cold.');
    const close = flags.find((f) => f.check === 'no-polite-close')!;
    expect(text.slice(close.start, close.end)).toBe('Sam');
  });
});

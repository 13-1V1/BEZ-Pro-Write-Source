// Created by: Brennan Meyer with use of Claude Code 11/03/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// @vitest-environment happy-dom
// The two P1s from the 11/03/2026 program-critic review, and what the review after them found.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flagKey, markFine } from '../src/checks';
import type { CheckSection, Flag } from '../src/checks/types';
import { draftFileExists, listDrafts } from '../src/drafts/drafts';
import { newDraft } from '../src/drafts/model';
import { damagedFiles } from '../src/storage/store';

// A file that isn't text makes the desktop read itself fail, not just the parse.
vi.mock('../src/storage/store', async (original) => {
  const real = await original<typeof import('../src/storage/store')>();
  return { ...real, readJson: async (rel: string) => { if (rel.includes('binary')) throw new Error('stream did not contain valid UTF-8'); return real.readJson(rel); } };
});

beforeEach(() => { localStorage.clear(); damagedFiles.clear(); });

describe('the same words twice in one part', () => {
  const flagsIn = (text: string): Flag[] =>
    [...text.matchAll(/really/g)].map((m) => ({ c: 'concise', check: 'filler', sectionId: 'details', start: m.index, end: m.index + 6, text: 'really' }));
  const part = (text: string) => [{ section: { id: 'details' }, text }] as unknown as CheckSection[];
  const marked = (text: string, fine: string[] = []) => markFine(flagsIn(text), fine, part(text));
  const three = 'I really need it. It is really late. We are really busy.';

  it('each copy gets its own key', () => {
    expect(new Set(marked(three).map((f) => f.key)).size).toBe(3);
  });

  it('identical copies with identical neighbors still get their own key', () => {
    const keys = marked('so really so, so really so').map((f) => f.key);
    expect(keys[1]).toBe(`${keys[0]}#2`);
  });

  it('marking one copy fine leaves the others still to look at', () => {
    const key = marked(three)[1].key!;
    expect(marked(three, [key]).map((f) => !!f.fine)).toEqual([false, true, false]);
  });

  it('a mark stays on its own spot when an earlier copy is edited away', () => {
    const key = marked(three)[1].key!;
    const edited = 'I need it. It is really late. We are really busy.';
    expect(marked(edited, [key]).map((f) => !!f.fine)).toEqual([true, false]);
  });

  it('a mark does not pass to another copy when its own spot is removed', () => {
    const key = marked(three)[0].key!;
    const edited = 'I need it. It is really late. We are really busy.';
    expect(marked(edited, [key]).map((f) => !!f.fine)).toEqual([false, false]);
  });

  it('a mark survives text moving elsewhere in the part', () => {
    const key = marked(three)[1].key!;
    expect(marked(`A new first sentence. ${three}`, [key]).map((f) => !!f.fine)).toEqual([false, true, false]);
  });

  it('a mark saved by an older version covers every copy, as it did then', () => {
    const plain = flagKey(flagsIn(three)[0]);
    expect(marked(three, [plain]).map((f) => !!f.fine)).toEqual([true, true, true]);
  });
});

describe('a damaged draft file', () => {
  it('is reported for Home instead of disappearing, and the good drafts still load', async () => {
    const good = newDraft();
    localStorage.setItem(`bez:drafts/${good.id}.json`, JSON.stringify(good));
    localStorage.setItem('bez:drafts/broken.json', '{"text": "oops", "checklist": [');
    const { drafts, unreadable } = await listDrafts();
    expect(drafts.map((d) => d.id)).toEqual([good.id]);
    expect(unreadable).toEqual(['broken.json']);
    expect(localStorage.getItem('bez:drafts/broken.json')).toBe('{"text": "oops", "checklist": [');
  });

  it('a file that is not text at all does not hide the good drafts', async () => {
    const good = newDraft();
    localStorage.setItem(`bez:drafts/${good.id}.json`, JSON.stringify(good));
    localStorage.setItem('bez:drafts/binary.json', 'x');
    const { drafts, unreadable } = await listDrafts();
    expect(drafts.map((d) => d.id)).toEqual([good.id]);
    expect(unreadable).toEqual(['binary.json']);
  });

  it('can be told from a deleted one', async () => {
    localStorage.setItem('bez:drafts/broken.json', '{ broken');
    expect(await draftFileExists('broken')).toBe(true);
    expect(await draftFileExists('gone')).toBe(false);
  });
});

// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Teach the app from a check row: add a word to My dictionary, or take a word
// off the list that flagged it. Both last across drafts, and both can be undone
// in Settings, on the Word rules tab.

import type { Flag } from '../checks/types';
import type { App } from '../flow/app';
import { teachNames } from '../spell/names';
import { saveListEdit, type ListId, type Pair, type WordLists } from '../wordlists/load';

/** The editable list behind each check that points at listed words. */
const LIST_OF: Record<string, ListId> = {
  filler: 'filler', adverb: 'adverbs', wordy: 'wordy', vague: 'vague', 'vague-date': 'vague-dates',
  jargon: 'jargon', simpler: 'simpler', slang: 'slang', harsh: 'harsh', unsure: 'unsure',
};

const sameWord = (entry: string | Pair, word: string) => (typeof entry === 'string' ? entry : entry.word).toLowerCase() === word.trim().toLowerCase();

/**
 * Every list that would point at a spot's words. A word can be on more than one
 * ("really" is filler and an adverb), and it has to come off them all to stop.
 * Empty when the spot wasn't flagged from a list.
 */
export function listsWith(f: Flag, lists: WordLists): ListId[] {
  if (!LIST_OF[f.check]) return [];
  const on = (id: ListId) => (lists[id] as (string | Pair)[]).some((e) => sameWord(e, f.text));
  return on(LIST_OF[f.check]) ? [...new Set(Object.values(LIST_OF))].filter(on) : [];
}

export function withoutWord(entries: (string | Pair)[], word: string): (string | Pair)[] {
  return entries.filter((e) => !sameWord(e, word));
}

/** Stop pointing at a word anywhere: it comes off every list it's on. */
export async function stopPointing(app: App, ids: ListId[], word: string): Promise<void> {
  for (const id of ids) {
    const next = withoutWord(app.data.lists[id] as (string | Pair)[], word) as string[] | Pair[];
    await saveListEdit(id, next);
    (app.data.lists as unknown as Record<string, unknown>)[id] = next;
  }
}

/** Add a word to My dictionary, so it stops being a spelling spot in every draft. */
export async function addToDictionary(app: App, word: string): Promise<void> {
  const next = [...app.data.lists['my-words'], word.trim()];
  await saveListEdit('my-words', next);
  app.data.lists['my-words'] = next;
  await teachNames(app);
}

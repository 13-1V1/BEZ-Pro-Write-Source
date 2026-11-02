// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Word lists: defaults ship in data/wordlists/, the user's edits live in
// settings/wordlists.json as full replacement lists. Reset = drop the edit.

import { readJson, writeJson } from '../storage/store';

export interface Pair {
  word: string;
  use: string;
}

export const LIST_DEFS = {
  wordy: { label: 'Wordy phrases', pairs: true, help: 'Phrase plus a shorter way to say it.' },
  simpler: { label: 'Simpler words', pairs: true, help: 'Hard word plus an everyday word.' },
  filler: { label: 'Filler words', pairs: false, help: 'Words that usually add nothing.' },
  vague: { label: 'Vague words', pairs: false, help: 'Fuzzy words that need a real number or name.' },
  'vague-dates': { label: 'Vague dates and times', pairs: false, help: 'Times that need a real date.' },
  jargon: { label: 'Jargon', pairs: false, help: 'Office-speak a stranger may not get.' },
  'common-acronyms': { label: 'Common acronyms (OK to use)', pairs: false, help: 'Acronyms everyone knows, so they are not flagged.' },
  slang: { label: 'Slang and text-speak', pairs: false, help: 'Too casual for professional writing.' },
  harsh: { label: 'Bossy or harsh words', pairs: false, help: 'Words that can sound rude or demanding.' },
  transitions: { label: 'Transition words', pairs: false, help: 'Words that link one paragraph to the last.' },
  adverbs: { label: 'Adverbs', pairs: false, help: '-ly words, pointed out only next to a weak verb (see the next list).' },
  'weak-verbs': { label: 'Weak verbs', pairs: false, help: 'Plain verbs like "walked" or "said". An adverb next to one is pointed out, since one stronger verb often does both jobs.' },
  passive: { label: 'Passive verbs (past participles)', pairs: false, help: 'Irregular verbs used to spot passive voice. Regular "-ed" verbs are found automatically.' },
  'passive-exceptions': { label: 'Not passive (describing words)', pairs: false, help: 'Words like "tired" or "excited" that describe a state, so "I was tired" is not flagged as passive.' },
  greetings: { label: 'Informal greetings', pairs: false, help: 'Too casual for a boss, customer, stranger, or teacher.' },
  'greetings-no-name': { label: 'Greetings OK without a name', pairs: false, help: 'Pass when you don\'t know the reader\'s name.' },
  'polite-closings': { label: 'Polite closings', pairs: false, help: 'Thank-you and sign-off words.' },
  'ask-phrases': { label: 'Ask phrases', pairs: false, help: 'Words that show a clear request or next step.' },
} as const;

export type ListId = keyof typeof LIST_DEFS;
export const LIST_IDS = Object.keys(LIST_DEFS) as ListId[];
export type PairListId = 'wordy' | 'simpler';
export type WordListId = Exclude<ListId, PairListId>;

export type WordLists = { [K in PairListId]: Pair[] } & { [K in WordListId]: string[] } & { passiveHelpers: string[] };

const defaults = import.meta.glob('../../data/wordlists/*.json', { eager: true, import: 'default' }) as Record<string, any>;
const USER_FILE = 'settings/wordlists.json';

function defaultFor(id: ListId): any {
  return defaults[`../../data/wordlists/${id}.json`];
}

export function defaultList(id: ListId): string[] | Pair[] {
  const d = defaultFor(id);
  return LIST_DEFS[id].pairs ? (d?.pairs ?? []) : (d?.words ?? []);
}

function validEntries(id: ListId, v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  return LIST_DEFS[id].pairs
    ? v.every((p) => p && typeof p.word === 'string' && typeof p.use === 'string')
    : v.every((w) => typeof w === 'string');
}

/** The shipped lists with no user edits (used by tests and "Reset to defaults"). */
export function defaultLists(): WordLists {
  const lists: any = { passiveHelpers: defaultFor('passive')?.helpers ?? [] };
  for (const id of LIST_IDS) lists[id] = defaultList(id);
  return lists;
}

export async function loadUserEdits(): Promise<Partial<Record<ListId, unknown>>> {
  return (await readJson<Partial<Record<ListId, unknown>>>(USER_FILE)) ?? {};
}

export async function loadWordLists(): Promise<{ lists: WordLists; problems: string[] }> {
  const problems: string[] = [];
  const edits = await loadUserEdits();
  const lists: any = { passiveHelpers: defaultFor('passive')?.helpers ?? ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'am'] };
  for (const id of LIST_IDS) {
    if (!defaultFor(id)) problems.push(`The built-in list "${id}.json" is missing.`);
    const edit = edits[id];
    if (edit !== undefined && !validEntries(id, edit)) problems.push(`Your edits to "${LIST_DEFS[id].label}" were unreadable, so the defaults are used.`);
    lists[id] = edit !== undefined && validEntries(id, edit) ? edit : defaultList(id);
  }
  return { lists, problems };
}

export async function saveListEdit(id: ListId, entries: string[] | Pair[] | null): Promise<void> {
  const edits = await loadUserEdits();
  if (entries === null) delete edits[id];
  else edits[id] = entries;
  await writeJson(USER_FILE, edits);
}

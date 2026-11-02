// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CONCISE: wordy phrases (with a shorter version), filler words, and adverbs
// propping up a weak verb ("walked quickly"). An adverb on its own is a
// part of speech, not a problem, so it isn't flagged.

import { findPhrases, outside, type Range } from './text';
import { flag, type CheckInput, type Flag } from './types';

/** The word right after the adverb, or one of the two right before it (in the same sentence), is a weak verb. */
export function nextToWeakVerb(text: string, r: Range, weak: Set<string>): boolean {
  const before = text.slice(0, r.start).split(/[.!?\n]/).pop()!.toLowerCase().match(/[a-z']+/g) ?? [];
  const after = text.slice(r.end).split(/[.!?\n]/)[0].toLowerCase().match(/[a-z']+/g) ?? [];
  return [...before.slice(-2), after[0]].some((w) => w !== undefined && weak.has(w));
}

export function concise(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const { lists } = input;
  const wordy = new Map(lists.wordy.map((p) => [p.word.toLowerCase(), p.use]));
  const weak = new Set(lists['weak-verbs'].map((w) => w.toLowerCase()));
  for (const { section, text } of input.sections) {
    const id = section.id;
    for (const r of findPhrases(text, [...wordy.keys()]))
      out.push(flag('concise', 'wordy', id, r.start, r.end, r.text, { use: wordy.get(r.text.toLowerCase().replace(/\s+/g, ' ')) }));
    // Standard sign-offs ("Yours truly,") aren't filler.
    const signOffs = findPhrases(text, lists['polite-closings']);
    for (const r of outside(findPhrases(text, lists.filler), signOffs)) out.push(flag('concise', 'filler', id, r.start, r.end, r.text));
    for (const r of outside(findPhrases(text, lists.adverbs), signOffs))
      if (nextToWeakVerb(text, r, weak)) out.push(flag('concise', 'adverb', id, r.start, r.end, r.text));
  }
  return out;
}

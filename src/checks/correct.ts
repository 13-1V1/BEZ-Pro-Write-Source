// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CORRECT: Harper spelling/grammar, slang and text-speak, sentences that
// start lowercase, and a lowercase "i" used as a word.

import { findPhrases, sentences } from './text';
import { flag, isProse, type CheckInput, type Flag } from './types';

/** True when the letter(s) at [start, end) are part of a dotted abbreviation like "U.S." or "i.e.". */
function inAbbreviation(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 2), start);
  const after = text.slice(end, end + 2);
  return /^\.[A-Za-z]/.test(after) || /[A-Za-z]\.$/.test(before);
}

export function correct(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const { lists } = input;
  for (const { section, text } of input.sections) {
    const id = section.id;
    for (const s of input.spell?.[id] ?? [])
      out.push(flag('correct', 'spelling', id, s.start, s.end, text.slice(s.start, s.end), { use: s.suggestions.join(', ') || undefined, detail: s.message }));
    for (const r of findPhrases(text, lists.slang)) {
      if (r.text.length === 1 && inAbbreviation(text, r.start, r.end)) continue;
      out.push(flag('correct', 'slang', id, r.start, r.end, r.text));
    }
    for (const m of text.matchAll(/(?<![\w'’])i(?![\w'’])/g)) {
      if (inAbbreviation(text, m.index!, m.index! + 1)) continue;
      out.push(flag('correct', 'lowercase-i', id, m.index!, m.index! + 1, 'i', { use: 'I' }));
    }
    if (isProse(section.role)) {
      for (const s of sentences(text)) {
        // First letter of the sentence, skipping opening quotes or brackets.
        const lead = s.text.match(/^["'“‘(\[]*([A-Za-z])/);
        if (!lead || !/[a-z]/.test(lead[1])) continue;
        const at = s.start + lead[0].length - 1;
        if (text[at] === 'i' && !/[\w'’]/.test(text[at + 1] ?? '')) continue; // already flagged as lowercase-i
        const word = text.slice(at).match(/^[A-Za-z'’]+/)![0];
        out.push(flag('correct', 'capital-start', id, at, at + word.length, word));
      }
    }
  }
  return out;
}

// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// COHERENT: body paragraphs with no linking word. The first real paragraph of each
// body section is skipped, since a new section is already a natural break.
// A soft hint only; it scores 0 by default.

import { findPhrases, paragraphs, sentences } from './text';
import { flag, type CheckInput, type Flag } from './types';

export function coherent(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  for (const { section, text } of input.sections) {
    if (section.role !== 'body') continue;
    // A name, greeting, or sign-off line ("Hello Ms. Alvarez,", "- B Meyer") isn't
    // a paragraph that needs linking: no sentence-ending punctuation means skip it.
    // The first real paragraph (after a pasted greeting, say) needs no link either.
    const prose = paragraphs(text).filter((p) => /[.!?]["'’”)]*\s*$/.test(p.text));
    for (const p of prose.slice(1)) {
      // Linking words belong at the start, so only the first sentence counts.
      const s = sentences(p.text)[0] ?? p;
      if (findPhrases(s.text, input.lists.transitions).length > 0) continue;
      out.push(flag('coherent', 'no-transition', section.id, p.start + s.start, p.start + s.end, s.text));
    }
  }
  return out;
}

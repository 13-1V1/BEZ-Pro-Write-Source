// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// COURTEOUS, the writer's side of tone: phrases that make a clear point sound
// like a guess, and a whole-piece note when most sentences are about the writer.

import { findPhrases, sentences } from './text';
import { flag, isProse, type CheckInput, type Flag } from './types';

const MIN_SENTENCES = 6;
const MOSTLY = 0.75;
const ABOUT_ME = /^["'“‘(\[]*(?:I|I['’](?:m|ve|d|ll)|My)\b/;

export function tone(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  let total = 0;
  let aboutMe = 0;
  for (const { section, text } of input.sections) {
    if (!isProse(section.role)) continue;
    for (const r of findPhrases(text, input.lists.unsure)) out.push(flag('courteous', 'unsure', section.id, r.start, r.end, r.text));
    if (section.role !== 'body' && section.role !== 'ask') continue;
    for (const s of sentences(text)) {
      total++;
      if (ABOUT_ME.test(s.text.trimStart())) aboutMe++;
    }
  }
  if (total >= MIN_SENTENCES && aboutMe / total >= MOSTLY)
    out.push(flag('courteous', 'reader-side', null, 0, 0, '', { detail: `${aboutMe} of your ${total} sentences start with "I" or "My".` }));
  return out;
}

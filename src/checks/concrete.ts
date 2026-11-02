// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CONCRETE: vague words ("some," "stuff") and vague dates ("tomorrow," "ASAP").

import { findPhrases, outside } from './text';
import { flag, type CheckInput, type Flag } from './types';

export function concrete(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const { lists } = input;
  for (const { section, text } of input.sections) {
    const id = section.id;
    const signOffs = findPhrases(text, lists['polite-closings']);
    for (const r of outside(findPhrases(text, lists.vague), signOffs)) out.push(flag('concrete', 'vague', id, r.start, r.end, r.text));
    // Sign-offs like "Talk soon," are normal; dates only matter in the message itself.
    if (section.role === 'closing' || section.role === 'signature') continue;
    for (const r of findPhrases(text, lists['vague-dates'])) out.push(flag('concrete', 'vague-date', id, r.start, r.end, r.text));
  }
  return out;
}

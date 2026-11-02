// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// COURTEOUS: bossy/harsh words, ALL CAPS, too many "!", the greeting check,
// and a polite close.

import { yourLabel } from '../ui/your';
import { hasTitle, normalize } from './complete';
import { capsWords, findPhrases } from './text';
import { flag, isProse, type CheckInput, type Flag } from './types';

const MAX_EXCLAMATIONS = 2;

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

export function courteous(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const { lists, prep } = input;
  const skipCaps = new Set([...lists['common-acronyms'], ...lists['vague-dates']].map((w) => w.toUpperCase()));

  let bangs = 0;
  for (const { section, text } of input.sections) {
    const id = section.id;
    for (const r of findPhrases(text, lists.harsh)) out.push(flag('courteous', 'harsh', id, r.start, r.end, r.text));

    for (const m of text.matchAll(/!/g)) {
      bangs++;
      if (bangs > MAX_EXCLAMATIONS) out.push(flag('courteous', 'exclamations', id, m.index!, m.index! + 1, '!'));
    }

    if (isProse(section.role)) {
      // 6+ letter caps words, or 2+ caps words in a row. Lone short ones are acronyms (Clear).
      for (const w of capsWords(text, skipCaps)) {
        if (w.text.length >= 6 || w.inRun) out.push(flag('courteous', 'all-caps', id, w.start, w.end, w.text));
      }
    }
  }

  // Greeting check: only on the greeting section, when the type has one and it isn't skipped/empty.
  const greet = input.sections.find((s) => s.section.role === 'greeting');
  if (greet) {
    const g = greet.text.trim();
    const lead = greet.text.length - greet.text.trimStart().length;
    const rel = input.relationships[prep.relationship];
    const opener = findPhrases(g.slice(0, 20), lists.greetings).find((r) => r.start === 0);
    const reader = prep.readerName.trim();
    const suggestion = reader ? `Dear ${hasTitle(reader) ? reader : `Mr./Ms./Dr. ${lastName(reader)}`},` : 'Dear Mr./Ms./Dr. [Last name],';
    if (rel?.formalGreeting && opener)
      out.push(flag('courteous', 'greeting-informal', greet.section.id, lead + opener.start, lead + opener.end, opener.text, { use: `${suggestion} or Hello ${reader || '[Name]'},` }));
    if (reader) {
      if (!normalize(g).includes(` ${normalize(lastName(reader)).trim()} `) && !normalize(g).includes(normalize(reader)))
        out.push(flag('courteous', 'greeting-name', greet.section.id, 0, greet.text.length, g, { use: suggestion }));
    }
    // No reader name + a greeting on the "OK without a name" list = fine; nothing to flag.
  }

  // Polite close: only on the closing section.
  const closingSection = input.allSections.find((s) => s.role === 'closing');
  if (closingSection) {
    const close = input.sections.find((s) => s.section.id === closingSection.id);
    if (close && findPhrases(close.text, lists['polite-closings']).length === 0)
      out.push(flag('courteous', 'no-polite-close', close.section.id, 0, close.text.length, close.text));
    if (!close && !closingSection.optional)
      out.push(flag('courteous', 'no-polite-close', closingSection.id, 0, 0, '', { detail: `${yourLabel(closingSection.label, false)} is empty.` }));
  }
  return out;
}

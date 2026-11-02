// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// COMPLETE: every Prep fact (key facts, reader's name, deadline) shows up in
// the text, and the Ask section has a clear request or next step.

import { yourLabel } from '../ui/your';
import { findPhrases } from './text';
import { flag, type CheckInput, type Flag } from './types';

/** "November" and "Nov", "Friday" and "Fri" count as the same word. */
const SHORT: Record<string, string> = {
  january: 'jan', february: 'feb', march: 'mar', april: 'apr', june: 'jun', july: 'jul', august: 'aug',
  september: 'sep', sept: 'sep', october: 'oct', november: 'nov', december: 'dec',
  monday: 'mon', tuesday: 'tue', tues: 'tue', wednesday: 'wed', thursday: 'thu', thur: 'thu', thurs: 'thu',
  friday: 'fri', saturday: 'sat', sunday: 'sun',
};

/** Case-insensitive, ignores punctuation and extra spaces, and short vs long month and day names. */
export function normalize(s: string): string {
  const words = s.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ');
  return ` ${words.map((w) => SHORT[w] ?? w).join(' ')} `;
}

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor', 'sir', 'madam', 'coach', 'pastor', 'rev']);

/** "Dr. Patel" has a title; "Drew Carter" doesn't (whole first word, not a prefix). */
export function hasTitle(name: string): boolean {
  return TITLES.has(normalize(name).trim().split(' ')[0] ?? '');
}

/** The reader counts as named if the full name OR their last name appears. */
function nameFound(name: string, hay: string): boolean {
  if (hay.includes(normalize(name))) return true;
  const parts = normalize(name).trim().split(' ').filter((w) => w.length > 1 && !TITLES.has(w));
  const last = parts[parts.length - 1];
  return !!last && hay.includes(` ${last} `);
}

export function complete(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const hay = normalize(input.sections.map((s) => s.text).join('\n'));
  const { prep } = input;

  for (const fact of prep.facts.split('\n').map((f) => f.trim()).filter(Boolean)) {
    if (normalize(fact).trim() && !hay.includes(normalize(fact))) out.push(flag('complete', 'missing-fact', null, 0, 0, fact));
  }
  if (prep.readerName.trim() && !nameFound(prep.readerName, hay)) out.push(flag('complete', 'missing-reader', null, 0, 0, prep.readerName.trim()));
  if (prep.deadline.trim() && !hay.includes(normalize(prep.deadline))) out.push(flag('complete', 'missing-deadline', null, 0, 0, prep.deadline.trim()));

  // Ask check only runs when this type has an Ask section.
  const askSection = input.allSections.find((s) => s.role === 'ask');
  if (askSection) {
    const ask = input.sections.find((s) => s.section.id === askSection.id);
    if (!ask) {
      if (!askSection.optional) out.push(flag('complete', 'no-ask', askSection.id, 0, 0, '', { detail: `${yourLabel(askSection.label, false)} is empty.` }));
    } else if (findPhrases(ask.text, input.lists['ask-phrases']).length === 0 && !ask.text.includes('?'))
      out.push(flag('complete', 'no-ask', ask.section.id, 0, ask.text.length, ask.text));
  }
  return out;
}

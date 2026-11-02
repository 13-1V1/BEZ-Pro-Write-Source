// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// COMPLETE: every Prep fact (key facts, reader's name, deadline) shows up in
// the text, and the Ask section has a clear request or next step.

import { yourLabel } from '../ui/your';
import { mainWords } from './goal';
import { findPhrases, sentences } from './text';
import { flag, type CheckInput, type Flag } from './types';

/** Where a Plan point shows up in the writing: a section and the sentence in it. */
export interface Spot { sectionId: string; start: number; end: number }

/** A word in this many sentences or more is what the whole piece is about, so it proves little. */
const EVERYWHERE = 3;

/**
 * A Plan fact counts as written if one sentence has at least half of its main
 * words (people put facts in their own words: "I posted it on my website" ->
 * "It can be found on my website"). A word used all through the piece ("program"
 * in an email about a program) counts half. Returns the best sentence, or null.
 */
export function factSpot(fact: string, input: CheckInput): Spot | null {
  const want = mainWords(fact);
  const all = input.sections.flatMap(({ section, text }) => sentences(text).map((s) => ({ section, s, words: new Set(mainWords(s.text, 3)) })));
  const uses = new Map<string, number>();
  for (const { words } of all) for (const w of words) uses.set(w, (uses.get(w) ?? 0) + 1);
  const weight = (w: string) => ((uses.get(w) ?? 0) >= EVERYWHERE ? 0.5 : 1);
  let best: Spot | null = null;
  let bestScore = 0;
  for (const { section, s, words: have } of all) {
    if (want.length === 0) {
      if (normalize(s.text).includes(normalize(fact))) return { sectionId: section.id, start: s.start, end: s.end };
      continue;
    }
    const score = want.filter((w) => have.has(w)).reduce((n, w) => n + weight(w), 0);
    // On a tie the shorter sentence wins: it's more likely to be about this fact.
    const better = score > bestScore || (score === bestScore && score > 0 && best !== null && s.end - s.start < best.end - best.start);
    if (better) { bestScore = score; best = { sectionId: section.id, start: s.start, end: s.end }; }
  }
  return want.length > 0 && bestScore * 2 >= want.length ? best : null;
}

/** The first sentence that passes the test (given normalized text), or null. */
function spotOf(test: (sentence: string) => boolean, input: CheckInput): Spot | null {
  for (const { section, text } of input.sections)
    for (const s of sentences(text)) if (test(normalize(s.text))) return { sectionId: section.id, start: s.start, end: s.end };
  return null;
}

export type PointKind = 'fact' | 'reader' | 'deadline' | 'ask';
export interface PlanPoint { kind: PointKind; text: string; spot: Spot | null }

/** Everything the Complete check looks for, found or not, so the screen can list it all. */
export function planPoints(input: CheckInput): PlanPoint[] {
  const { prep } = input;
  const out: PlanPoint[] = factLines(prep.facts).map((f) => ({ kind: 'fact' as const, text: f, spot: factSpot(f, input) }));
  if (prep.readerName.trim()) out.push({ kind: 'reader', text: prep.readerName.trim(), spot: spotOf((s) => nameFound(prep.readerName, s), input) });
  if (prep.deadline.trim()) out.push({ kind: 'deadline', text: prep.deadline.trim(), spot: spotOf((s) => s.includes(normalize(prep.deadline)), input) });
  const askSection = input.allSections.find((s) => s.role === 'ask');
  if (askSection) {
    const ask = input.sections.find((s) => s.section.id === askSection.id);
    const clear = !!ask && (findPhrases(ask.text, input.lists['ask-phrases']).length > 0 || ask.text.includes('?'));
    out.push({ kind: 'ask', text: '', spot: clear ? { sectionId: ask!.section.id, start: 0, end: ask!.text.length } : null });
  }
  return out;
}

/** One fact per line of the Plan's facts box, blank lines left out. */
function factLines(facts: string): string[] {
  return facts.split(/\r?\n/).map((f) => f.trim()).filter((f) => normalize(f).trim());
}

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

  for (const fact of factLines(prep.facts)) {
    if (!factSpot(fact, input)) out.push(flag('complete', 'missing-fact', null, 0, 0, fact));
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

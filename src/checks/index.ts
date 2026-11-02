// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Run all 7 C's, drop duplicate flags within a C, and weight them for the style score.

import checkText from '../../data/checks.json';
import scoring from '../../data/scoring.json';
import { clear } from './clear';
import { coherent } from './coherent';
import { complete } from './complete';
import { concise } from './concise';
import { concrete } from './concrete';
import { correct } from './correct';
import { courteous } from './courteous';
import { goalLate } from './goal';
import type { CId } from './cs';
import type { CheckInput, Flag } from './types';

export interface CheckInfo {
  c: CId;
  label: string;
  why: string;
  try: string;
}

export const CHECK_INFO = checkText as unknown as Record<string, CheckInfo>;

const RUNNERS: ((input: CheckInput) => Flag[])[] = [clear, goalLate, concise, concrete, correct, coherent, complete, courteous];

/** Same C pointing at the same words twice (e.g. "really" as filler AND adverb) counts once. */
function dedupe(flags: Flag[]): Flag[] {
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.c}|${f.sectionId}|${f.start}|${f.end}|${f.sectionId === null ? f.check + f.text : ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function runChecks(input: CheckInput): Flag[] {
  return dedupe(RUNNERS.flatMap((run) => run(input)));
}

/** Drop flags from checks the user turned off in Settings. */
export function activeFlags(flags: Flag[], disabled: readonly string[]): Flag[] {
  if (disabled.length === 0) return flags;
  const off = new Set(disabled);
  return flags.filter((f) => !off.has(f.check));
}

export function weightOf(f: Flag): number {
  const s = scoring as { defaultWeight: number; byC: Record<string, number>; byCheck: Record<string, number> };
  return s.byCheck[f.check] ?? s.byC[f.c] ?? s.defaultWeight;
}

/**
 * Only flags on words actually written count toward the style score.
 * "Missing" notes (empty Ask, a key fact not used yet) show on the 7 C's
 * screens but don't drag the score down while someone is still writing.
 */
export function weightedTotal(flags: Flag[]): number {
  return flags.filter((f) => f.end > f.start && !f.fine).reduce((n, f) => n + weightOf(f), 0);
}

/**
 * Names one spot by what it is, not where it is, so "This one's fine" survives
 * edits elsewhere in the piece (offsets move; the check and the words don't).
 */
export function flagKey(f: Flag): string {
  return `${f.check}|${f.sectionId ?? ''}|${f.text.trim().toLowerCase()}`;
}

/** Mark the spots the user already said are fine. */
export function markFine(flags: Flag[], fine: readonly string[]): Flag[] {
  if (fine.length === 0) return flags;
  const set = new Set(fine);
  return flags.map((f) => (set.has(flagKey(f)) ? { ...f, fine: true } : f));
}

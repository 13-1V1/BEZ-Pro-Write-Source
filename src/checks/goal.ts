// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CLEAR, whole-piece note: the goal from the Plan ("What do you want them to
// do or know?") should show up near the start. Compares the goal's main words
// with the first two sentences of the first body part. Points, never fixes.

import { sentences } from './text';
import { flag, type CheckInput, type Flag } from './types';

const SMALL = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'have', 'they', 'them', 'their', 'will', 'would', 'about', 'what',
  'when', 'your', 'into', 'just', 'some', 'more', 'than', 'then', 'also', 'want', 'need', 'know', 'make', 'sure', 'please', 'after', 'reading']);

/** "fixed", "fixing", "fixes" → "fix"; then the first 5 letters, so "heater" matches "heaters". */
export const stem = (w: string) => {
  // A plural first ("writings" → "writing"), then the verb ending ("writing" → "writ").
  const one = w.length > 4 ? w.replace(/(?<!s)s$/, '') : w;
  const cut = one.replace(/(ing|ed|es)$/, '');
  return (cut.length >= 3 ? cut : one).slice(0, 5);
};

const SMALL_STEMS = new Set([...SMALL].map(stem));

/** "Email me a copy of my lease" → ["email", "copy", "lease"]. `min` is the shortest word kept. */
export function mainWords(text: string, min = 4): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z'’]+/g) ?? [])
    .filter((w) => w.length >= min && !SMALL.has(w))
    .map(stem)
    // "wanted", "needs": the same small words with an ending.
    .filter((w) => !SMALL_STEMS.has(w)))];
}

export function goalLate(input: CheckInput): Flag[] {
  const goal = mainWords(input.prep.goal);
  // A goal of one main word is too little to compare.
  if (goal.length < 2) return [];
  const first = input.sections.find((s) => s.section.role === 'body');
  if (!first) return [];
  const opening = sentences(first.text).slice(0, 2).map((s) => s.text).join(' ');
  const said = new Set(mainWords(opening, 3));
  const found = goal.filter((w) => said.has(w)).length;
  // A third of the goal's main words is enough: people put their goal in new words
  // ("get her opinion" in the Plan, "get your feedback" in the email).
  return found * 3 >= goal.length ? [] : [flag('clear', 'goal-late', null, 0, 0, input.prep.goal.trim())];
}

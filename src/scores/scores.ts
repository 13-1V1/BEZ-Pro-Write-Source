// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Readability (Flesch Reading Ease, 0–100), style score, and reading time.
// A 0–100 score is used instead of a school grade level so it never reads
// like a judgment of the writer.

import { syllable } from 'syllable';
import { sentences } from '../checks/text';
import { wordsOf } from './words';

export interface ReadingResult {
  /** Flesch Reading Ease, 0–100. Higher = easier to read. */
  score: number;
  words: number;
  sentences: number;
  syllables: number;
}

/** Ease = 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words), kept to 0–100. */
export function readingEase(text: string): ReadingResult {
  const sents = sentences(text).filter((s) => wordsOf(s.text).length > 0);
  const words = wordsOf(text);
  const syl = words.reduce((n, w) => n + Math.max(1, syllable(w)), 0);
  if (words.length === 0 || sents.length === 0) return { score: 0, words: 0, sentences: 0, syllables: 0 };
  const ease = 206.835 - 1.015 * (words.length / sents.length) - 84.6 * (syl / words.length);
  return { score: Math.round(Math.min(100, Math.max(0, ease))), words: words.length, sentences: sents.length, syllables: syl };
}

export type Level = 'green' | 'yellow' | 'red';

/** Green at or above the target, yellow up to 10 points under, red below that. */
export function readingLevel(score: number, target: number): { level: Level; text: string } {
  if (score >= target) return { level: 'green', text: 'Easy to read' };
  if (score >= target - 10) return { level: 'yellow', text: 'A little hard' };
  return { level: 'red', text: 'Hard to read' };
}

/** score = max(0, 100 − (sum of weighted flags ÷ word count × 100)) */
export function styleScore(weightedFlags: number, wordCount: number): number {
  if (wordCount === 0) return 100;
  return Math.max(0, Math.round(100 - (weightedFlags / wordCount) * 100));
}

export function styleLevel(score: number): { level: Level; text: string } {
  if (score >= 80) return { level: 'green', text: 'Strong' };
  if (score >= 60) return { level: 'yellow', text: 'Needs a little work' };
  return { level: 'red', text: 'Needs work' };
}

/** Words ÷ 230 per minute, rounded up. */
export function readingMinutes(wordCount: number): number {
  return Math.ceil(wordCount / 230);
}

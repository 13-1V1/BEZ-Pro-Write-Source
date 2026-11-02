// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// One place that computes the live stats, so the side panel and the
// status bar always show the same numbers.

import { styleFor } from '../checks/run';
import { assemble } from '../export/assemble';
import type { App } from '../flow/app';
import { readingEase, readingLevel, readingMinutes, styleLevel, type Level } from './scores';
import { countWords } from './words';

export const MIN_WORDS_FOR_READING = 30;

export interface Stats {
  words: number;
  minutes: number;
  reading: number | null;
  readingLevel: Level | null;
  readingText: string;
  style: number | null;
  styleLevel: Level | null;
  styleText: string;
}

export function computeStats(app: App): Stats {
  const d = app.draft!;
  const piece = assemble(d, app.sections);
  const words = countWords(piece.parts.map((x) => x.text).join('\n\n'));
  // Readability only counts real sentences, not address blocks or signatures.
  const prose = piece.parts.filter((x) => x.section.role !== 'header' && x.section.role !== 'signature').map((x) => x.text).join('\n\n');
  const r = readingEase(prose);
  // Readability is noise on a few words; wait for enough text to mean something.
  const enough = r.words >= MIN_WORDS_FOR_READING;
  const target = (app.type && app.data.prefs.readingTargets[app.type.id]) ?? app.type?.readingTarget ?? 60;
  const rl = readingLevel(r.score, target);
  // Like readability, the style score swings wildly on a few words, so wait for 30.
  const score = words >= MIN_WORDS_FOR_READING ? styleFor(app) : null;
  const sl = score === null ? null : styleLevel(score);
  return {
    words,
    minutes: words ? readingMinutes(words) : 0,
    reading: enough ? r.score : null,
    readingLevel: enough ? rl.level : null,
    readingText: enough ? rl.text : r.words ? 'Write a bit more' : '',
    style: score,
    styleLevel: sl?.level ?? null,
    styleText: sl?.text ?? (words ? 'Write a bit more' : ''),
  };
}

// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CORRECT: a subject line that mixes capital styles ("New Writing Program I
// wanted to Share"). Points at the lowercase main words; never changes them.

import { flag, type CheckInput, type Flag } from './types';

/** Words Title Case often leaves lowercase, so they never count either way. */
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'nor', 'for', 'so', 'yet', 'of', 'to', 'in', 'on', 'at', 'by', 'up', 'as', 'via', 'vs', 'per',
  'with', 'from', 'into', 'onto', 'upon', 'over', 'about', 'after', 'than', 'off', 'out', 'like', 'near', 'past', 'till']);
/** Always capitalized, so they say nothing about the line's style. */
const ALWAYS = /^(i|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)$/i;
const LABEL = /^\s*(subject|re)\s*:\s*/i;

interface Word { start: number; end: number; text: string }

/**
 * Subject lines: in a header section, the first line after a "Subject:" prefix
 * or any line that starts "Subject:" or "Re:"; in any other section (like the
 * one big box of "Check something I wrote"), only a first line that starts so.
 */
function subjectLines(text: string, header: boolean, prefix: string | undefined): Word[] {
  const out: Word[] = [];
  let at = 0;
  text.split('\n').forEach((line, i) => {
    const label = line.match(LABEL);
    if (label && (header || i === 0)) out.push({ start: at + label[0].length, end: at + line.length, text: line.slice(label[0].length) });
    else if (header && i === 0 && LABEL.test(prefix ?? '')) out.push({ start: at, end: at + line.length, text: line });
    at += line.length + 1;
  });
  return out;
}

/**
 * Lowercase main words that sit between capitalized ones in a run that is mostly
 * Title Case. The first word of each run is skipped. A lowercase word only before
 * or after the capitals ("Meeting with Dana Alvarez tomorrow") is left alone,
 * since those capitals are usually a name.
 */
function mixedIn(run: Word[], names: Set<string>): Word[] {
  const main = run.slice(1).filter((w) => !SMALL.has(w.text.toLowerCase()) && !ALWAYS.test(w.text) && !names.has(w.text.toLowerCase())
    && /\p{Ll}/u.test(w.text) && !/^.\P{Lu}*\p{Lu}/u.test(w.text)); // skip acronyms and "iPhone", "BEZ"
  const upper = main.filter((w) => /^\p{Lu}/u.test(w.text));
  if (upper.length < 2 || upper.length < main.length - upper.length) return [];
  const first = upper[0].start;
  const last = upper[upper.length - 1].start;
  return main.filter((w) => /^\p{Ll}/u.test(w.text) && w.start > first && w.start < last);
}

export function subjectCaps(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const names = new Set(input.prep.readerName.toLowerCase().split(/[^\p{L}'’-]+/u).filter(Boolean));
  for (const { section, text } of input.sections) {
    for (const line of subjectLines(text, section.role === 'header', section.prefix)) {
      // "Meeting request: Budget Review" is two runs: a label, then a title.
      let run: Word[] = [];
      const runs: Word[][] = [run];
      for (const m of line.text.matchAll(/\p{L}[\p{L}'’-]*|[:;–—]/gu)) {
        if (/^[:;–—]$/.test(m[0])) runs.push((run = []));
        else run.push({ start: line.start + m.index!, end: line.start + m.index! + m[0].length, text: m[0] });
      }
      for (const w of runs.flatMap((r) => mixedIn(r, names))) out.push(flag('correct', 'subject-caps', section.id, w.start, w.end, w.text));
    }
  }
  return out;
}

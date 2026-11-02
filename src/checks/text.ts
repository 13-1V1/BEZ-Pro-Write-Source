// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Split text into sentences and paragraphs, keeping character positions.

export interface Range {
  start: number;
  end: number;
  text: string;
}

// Words ending in "." that don't end a sentence.
const ABBREV = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd', 'rd', 'apt', 'vs', 'etc', 'inc', 'ltd', 'co',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun', 'e.g', 'i.e', 'a.m', 'p.m', 'u.s', 'approx', 'dept', 'ext',
]);

const LABEL_WORDS = new Set(['room', 'plan', 'unit', 'building', 'section', 'apartment', 'apt', 'option', 'grade', 'type', 'part', 'lot', 'gate',
  'door', 'floor', 'wing', 'step', 'level', 'phase', 'team', 'group', 'row', 'aisle', 'appendix', 'exhibit', 'class', 'shift', 'suite', 'bay', 'dock']);
const DAY_OR_MONTH =/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/;

function trimRange(text: string, start: number, end: number): Range | null {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return end > start ? { start, end, text: text.slice(start, end) } : null;
}

/** Sentences end at . ! ? (not after a known abbreviation or inside a number) or at a line break. */
export function sentences(text: string): Range[] {
  const out: Range[] = [];
  let start = 0;
  const push = (end: number) => {
    const r = trimRange(text, start, end);
    if (r) out.push(r);
    start = end;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') {
      push(i);
      continue;
    }
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    // Swallow runs like "?!" or "..." and closing quotes/brackets.
    let j = i + 1;
    while (j < text.length && /[.!?"'’”)\]]/.test(text[j])) j++;
    if (j < text.length && !/\s/.test(text[j])) continue; // "3.5", "a.m.x"
    if (ch === '.') {
      const before = text.slice(start, i).match(/([A-Za-z.]+)$/)?.[1]?.toLowerCase();
      // "4 p.m. Write the memo" ends a sentence; "by 3 p.m. Monday" doesn't.
      const nextWord = text.slice(j).match(/^\s+([A-Z][a-z]*)/)?.[1];
      if ((before === 'a.m' || before === 'p.m') && nextWord && !DAY_OR_MONTH.test(nextWord)) {
        push(j);
        i = j - 1;
        continue;
      }
      // A lone letter is an initial ("John F. Kennedy"), except after a label
      // word: "Room B. Tell the team" and "Plan B. It works" end a sentence.
      const labelled = /^[a-z]$/.test(before ?? '') && LABEL_WORDS.has(text.slice(start, i - 1).match(/([A-Za-z]+)\s*$/)?.[1]?.toLowerCase() ?? '');
      if (before && !labelled && (ABBREV.has(before) || /^[a-z]$/.test(before))) continue;
      // "No. 5" is a number; "The answer is no." ends a sentence.
      if (before === 'no' && /^\s*\d/.test(text.slice(j))) continue;
    }
    push(j);
    i = j - 1;
  }
  push(text.length);
  return out;
}

/** Paragraphs are separated by a blank line. */
export function paragraphs(text: string): Range[] {
  const out: Range[] = [];
  const re = /\n[ \t]*\n/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const r = trimRange(text, start, m.index);
    if (r) out.push(r);
    start = m.index + m[0].length;
  }
  const r = trimRange(text, start, text.length);
  if (r) out.push(r);
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Find whole-word (or whole-phrase) matches of any list entry, case-insensitive.
 * Spaces in a phrase match any run of whitespace. Longest entries win.
 */
export function findPhrases(text: string, entries: string[]): Range[] {
  const list = [...new Set(entries.map((e) => e.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (list.length === 0) return [];
  const body = list.map((e) => escapeRe(e).replace(/['’]/g, "['’]").replace(/\s+/g, '\\s+')).join('|');
  const re = new RegExp(`(?<![\\w'’])(?:${body})(?![\\w'’])`, 'gi');
  const out: Range[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

export interface CapsWord extends Range {
  /** Sits next to another caps word (only spaces between), like "PLEASE READ". */
  inRun: boolean;
}

/**
 * All-capital words of 2+ letters, minus any in `skip` (known acronyms, "ASAP").
 * Shared by Clear (acronyms) and Courteous (ALL CAPS) so they agree on which is which.
 */
export function capsWords(text: string, skip: Set<string>): CapsWord[] {
  const found = [...text.matchAll(/\b[A-Z][A-Z'’]+\b/g)]
    .map((m) => ({ start: m.index!, end: m.index! + m[0].length, text: m[0], inRun: false }));
  // Runs first, so "THE CEO SAID NO" is still one shouted run after CEO is skipped.
  for (let i = 1; i < found.length; i++) {
    if (/^[ \t]+$/.test(text.slice(found[i - 1].end, found[i].start))) found[i - 1].inRun = found[i].inRun = true;
  }
  return found.filter((w) => !skip.has(w.text.replace(/['’]/g, '')));
}

/** Drop matches that sit inside one of `keep` (e.g. "many" inside the sign-off "Many thanks,"). */
/** Web links and email addresses: written exactly as they must be typed, so checks leave them alone. */
export function linkRanges(text: string): Range[] {
  return [...text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi)].map((m) => {
    // A period or comma right after a link ends the sentence; it isn't part of the link.
    const t = m[0].replace(/[.,;:!?)\]]+$/, '');
    return { start: m.index!, end: m.index! + t.length, text: t };
  });
}

/** True if [start, end) sits inside one of the ranges. */
export function inside(start: number, end: number, ranges: Range[]): boolean {
  return ranges.some((r) => start >= r.start && end <= r.end);
}

export function outside(found: Range[], keep: Range[]): Range[] {
  return found.filter((r) => !keep.some((k) => r.start >= k.start && r.end <= k.end));
}

// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CORRECT: a number that nearly matches one in the Plan (4417 for 4471), and a
// weekday that doesn't fit its date ("Monday, Nov 6" when Nov 6 is a Friday).
// Both only point; the app never says the writing is wrong about the real world.

import { flag, type CheckInput, type Flag } from './types';

interface Num { value: string; raw: string; start: number; end: number }

const NUMBER = /\d+(?:,\d{3})*(?:\.\d+)?/g;
const NEAR_MIN_DIGITS = 3;
const NUMBER_WORDS: Record<string, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
};

/** Every number in the text, commas and ".00" dropped so "$1,200.00" equals "1200". */
function numbers(text: string): Num[] {
  return [...text.matchAll(NUMBER)].map((m) => ({
    value: m[0].replace(/,/g, '').replace(/\.0+$/, ''), raw: m[0], start: m.index!, end: m.index! + m[0].length,
  }));
}

/** Years and the "00" in "3:00" say little: a fact can be written without them. */
const isYear = (v: string) => /^(19|20)\d\d$/.test(v);
const matters = (v: string) => !isYear(v) && !/^0+$/.test(v);

/** True when every number in a Plan fact shows up in the writing, as digits or (up to 12) a word. */
export function numbersWritten(fact: string, writing: string): boolean {
  const have = new Set(numbers(writing).map((n) => n.value));
  const lower = ` ${writing.toLowerCase().replace(/[^a-z]+/g, ' ')} `;
  return numbers(fact).every((n) => !matters(n.value) || have.has(n.value) || (!!NUMBER_WORDS[n.value] && lower.includes(` ${NUMBER_WORDS[n.value]} `)));
}

/** One digit changed, two side-by-side digits swapped, or (4+ digits) one digit added or left out. */
export function nearMiss(a: string, b: string): boolean {
  if (a === b) return false;
  if (a.length === b.length) {
    const diff = [...a].flatMap((ch, i) => (ch === b[i] ? [] : [i]));
    if (diff.length === 1) return true;
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  if (long.length - short.length !== 1 || short.length < 4) return false;
  return [...long].some((_, i) => long.slice(0, i) + long.slice(i + 1) === short);
}

function planNumbers(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const written = input.sections.map((s) => s.text).join('\n');
  const have = new Set(numbers(written).map((n) => n.value));
  const planned = numbers(`${input.prep.facts}\n${input.prep.deadline}`)
    .filter((n) => n.value.length >= NEAR_MIN_DIGITS && !isYear(n.value) && !have.has(n.value));
  if (planned.length === 0) return out;
  for (const { section, text } of input.sections)
    for (const n of numbers(text)) {
      if (n.value.length < NEAR_MIN_DIGITS || isYear(n.value)) continue;
      const plan = planned.find((p) => nearMiss(p.value, n.value));
      if (plan) out.push(flag('correct', 'plan-number', section.id, n.start, n.end, n.raw, { detail: `Your Plan says ${plan.raw}.` }));
    }
  return out;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 'sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat';
const MONTH = 'january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec';
const NAMED = new RegExp(`\\b(${DAY})\\b\\.?,?\\s+(${MONTH})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4})\\b)?`, 'gi');
const SLASHED = new RegExp(`\\b(${DAY})\\b\\.?,?\\s+(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}|\\d{2}))?\\b`, 'gi');

const indexOfName = (names: string[], word: string) => names.findIndex((n) => n.toLowerCase().startsWith(word.slice(0, 3).toLowerCase()));

/** With no year written, the date nearest the day the piece was written. */
function nearestYear(month: number, day: number, now: number): number {
  const year = new Date(now).getFullYear();
  return [year - 1, year, year + 1].sort((a, b) => Math.abs(Date.UTC(a, month, day) - now) - Math.abs(Date.UTC(b, month, day) - now))[0];
}

function checkDate(id: string, text: string, m: RegExpMatchArray, month: number, day: number, yearText: string | undefined, now: number): Flag | null {
  // "sat" and "sun" are also plain words; a short day name needs its capital.
  if (m[1].length <= 5 && !DAYS.some((d) => d.toLowerCase() === m[1].toLowerCase()) && m[1][0] === m[1][0].toLowerCase()) return null;
  if (month < 0 || month > 11) return null;
  const year = yearText ? (yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText)) : nearestYear(month, day, now);
  const date = new Date(Date.UTC(year, month, day));
  const start = m.index!;
  const end = start + m[0].length;
  const said = text.slice(start, end);
  if (date.getUTCMonth() !== month || day < 1)
    return flag('correct', 'weekday-date', id, start, end, said, { detail: `${MONTHS[month]} doesn't have a day ${day} in ${year}.` });
  const named = indexOfName(DAYS, m[1]);
  if (date.getUTCDay() === named) return null;
  return flag('correct', 'weekday-date', id, start, end, said, { detail: `${MONTHS[month]} ${day}, ${year} is a ${DAYS[date.getUTCDay()]}.` });
}

function weekdayDates(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const now = input.now;
  if (now === undefined) return out;
  for (const { section, text } of input.sections) {
    for (const m of text.matchAll(NAMED)) {
      const f = checkDate(section.id, text, m, indexOfName(MONTHS, m[2]), Number(m[3]), m[4], now);
      if (f) out.push(f);
    }
    for (const m of text.matchAll(SLASHED)) {
      const f = checkDate(section.id, text, m, Number(m[2]) - 1, Number(m[3]), m[4], now);
      if (f) out.push(f);
    }
  }
  return out;
}

export function factGuard(input: CheckInput): Flag[] {
  return [...planNumbers(input), ...weekdayDates(input)];
}

// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Cut the writing into pieces the voice reads one at a time: one sentence each,
// so the first one starts quickly, and every line on its own ("Hi Sam," is a
// line, not the start of a sentence). Only what is spoken changes, never the text.

import { sentences } from '../checks/text';

/** Kokoro reads up to ~500 sound units at once; a very long sentence is cut at commas or spaces. */
const MAX_CHARS = 300;

/** A line that stops on a comma or nothing ("Hi Sam,", "Best regards,") gets a period, so the voice ends it instead of rising like a question. */
export function finishLine(line: string): string {
  const t = line.trim().replace(/[,;:]+$/, '');
  return /[.!?…"'”)\]]$/.test(t) ? t : `${t}.`;
}

function splitLong(s: string): string[] {
  const out: string[] = [];
  let rest = s;
  while (rest.length > MAX_CHARS) {
    const window = rest.slice(0, MAX_CHARS);
    const cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '));
    const at = cut > MAX_CHARS / 3 ? cut + 1 : window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') : MAX_CHARS;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function speechChunks(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\n+/)) {
    if (!/[A-Za-z0-9]/.test(line)) continue;
    for (const s of sentences(line)) out.push(...splitLong(finishLine(s.text)));
  }
  return out;
}

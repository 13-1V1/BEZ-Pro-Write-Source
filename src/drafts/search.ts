// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Home search: does a draft match what the user typed in the search box?
// Every word must appear somewhere in the title, the plan, or the writing.

import type { Draft } from './model';

export function draftMatches(d: Draft, query: string, typeName = ''): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [d.title, typeName, d.prep.readerName, d.prep.readerRole, d.prep.goal, d.prep.facts, d.prep.deadline, ...Object.values(d.text)]
    .join(' ')
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}

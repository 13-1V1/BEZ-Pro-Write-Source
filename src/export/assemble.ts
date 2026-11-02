// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Join the user's section texts into the finished piece.
// Also reports where each section lands, so checks can map highlights back.

import type { Draft } from '../drafts/model';
import type { Section } from '../types/schema';

export interface Part {
  section: Section;
  text: string;
  /** Start of the user's own text inside the full piece (after any prefix). */
  start: number;
}

export interface Piece {
  text: string;
  parts: Part[];
}

export function usedSections(draft: Draft, sections: Section[]): Section[] {
  return sections.filter((s) => !draft.skipped[s.id] && (draft.text[s.id] ?? '').trim() !== '');
}

export function assemble(draft: Draft, sections: Section[]): Piece {
  let text = '';
  const parts: Part[] = [];
  for (const section of usedSections(draft, sections)) {
    const body = (draft.text[section.id] ?? '').replace(/\s+$/, '').replace(/^\n+/, '');
    if (parts.length > 0) text += '\n'.repeat((section.gapBefore ?? 1) + 1);
    text += section.prefix ?? '';
    parts.push({ section, text: body, start: text.length });
    text += body;
  }
  return { text, parts };
}

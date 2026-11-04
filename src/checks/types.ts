// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Shared shapes for the 7 C's checks. Checks only POINT at text; they never change it.

import type { Prep } from '../drafts/model';
import type { SpellIssue } from '../spell/harper';
import type { Role, Section } from '../types/schema';
import type { WordLists } from '../wordlists/load';
import type { CId } from './cs';

export interface Flag {
  c: CId;
  /** Check id, matching a key in data/checks.json. */
  check: string;
  /** Section the flag points into, or null for whole-piece notes (like a missing fact). */
  sectionId: string | null;
  start: number;
  end: number;
  /** The flagged words, or the missing item for whole-piece notes. */
  text: string;
  /** Simpler word / shorter phrase / spelling idea, when there is one. */
  use?: string;
  /** Extra plain-words detail for this one flag. */
  detail?: string;
  /** The user looked at it and said "This one's fine": still shown (grayed), not counted. */
  fine?: boolean;
  /** A word the spell checker doesn't know, so it can go in My dictionary. */
  unknownWord?: boolean;
  /** This spot's own key (set by markFine): flagKey plus the words beside it, so copies of the same words differ. */
  key?: string;
}

export interface CheckSection {
  section: Section;
  text: string;
}

export interface CheckInput {
  /** Sections in order, with the user's text. Skipped or empty sections are left out. */
  sections: CheckSection[];
  /** Every section the type has (so "this type has an Ask" can be told apart from "Ask was skipped"). */
  allSections: Section[];
  prep: Prep;
  lists: WordLists;
  relationships: Record<string, { tip: string; formalGreeting: boolean }>;
  /** Harper results per section id, when available. */
  spell?: Record<string, SpellIssue[]>;
  /** When the piece was last worked on: a date with no year means the nearest one. Without it, weekdays aren't checked. */
  now?: number;
}

/** Sentence-level checks skip address blocks, dates, To/From lines, and signatures. */
export function isProse(role: Role): boolean {
  return role !== 'header' && role !== 'signature';
}

export function flag(c: CId, check: string, sectionId: string | null, start: number, end: number, text: string, extra: Partial<Flag> = {}): Flag {
  return { c, check, sectionId, start, end, text, ...extra };
}

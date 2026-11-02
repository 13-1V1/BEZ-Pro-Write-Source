// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Glue between the app and the checks: builds the input from the current
// draft; Harper results come from the shared cache in src/spell/cache.ts.

import { usedSections } from '../export/assemble';
import type { Draft } from '../drafts/model';
import type { App } from '../flow/app';
import { styleScore } from '../scores/scores';
import { countWords } from '../scores/words';
import { cachedSpelling, checkWhenIdle } from '../spell/cache';
import { teachNames } from '../spell/names';
import type { SpellIssue } from '../spell/harper';
import { activeFlags, markFine, runChecks, weightedTotal } from './index';
import { backToBox, taggedSections } from './tagged';

/** The hidden "Check something I wrote" type (data/types/own.json). */
export const OWN_TYPE = 'own';
import type { CheckInput, Flag } from './types';

let onSpellReady: (() => void) | null = null;

/** Called when new Harper results arrive, so screens can redraw. */
export function whenSpellUpdates(fn: () => void): void {
  onSpellReady = fn;
}

export function checkInput(app: App, d: Draft = app.draft!, live = true): CheckInput {
  let all = app.sections;
  let sections = usedSections(d, all).map((section) => ({ section, text: d.text[section.id] ?? '' }));
  // Spelling is checked on the text as written (the box), then shared out to its parts.
  const asWritten = sections.map((s) => s.text);
  // Check something I wrote: paragraphs the user marked greeting / Ask / closing become parts.
  const box = sections[0];
  const tagged = d.typeId === OWN_TYPE && !!box && Object.keys(d.tags).length > 0;
  if (tagged) ({ sections, all } = taggedSections(box.section, box.text, d.tags));
  // Use results already in hand; ask for the rest once typing pauses.
  const spell: Record<string, SpellIssue[]> = {};
  const issues = asWritten.flatMap((t) => cachedSpelling(t) ?? []);
  for (const s of sections) spell[s.section.id] = tagged ? issues.filter((i) => s.text[i.start]?.trim()) : cachedSpelling(s.text) ?? [];
  if (live) checkWhenIdle(asWritten, () => onSpellReady?.(), () => teachNames(app));
  return { sections, allSections: all, prep: d.prep, lists: app.data.lists, relationships: app.data.relationships, spell };
}

/** Run the checks, drop the ones turned off, mark the "fine" ones, and point tagged parts back at the box. */
function flagsOf(app: App, input: CheckInput, d: Draft): Flag[] {
  const flags = markFine(activeFlags(runChecks(input), app.data.prefs.disabledChecks), d.fine);
  return d.typeId === OWN_TYPE ? backToBox(flags, input.sections[0]?.section.id.split('~')[0] ?? '', input.sections) : flags;
}

/** Every spot to show, with the ones the user marked "This one's fine" flagged as `fine`. */
export function flagsFor(app: App): Flag[] {
  return flagsOf(app, checkInput(app), app.draft!);
}

/** Spots on written words (not notes, not ones marked fine) in another version of this draft's writing. */
export function spotsIn(app: App, text: Record<string, string>): number {
  const d = { ...app.draft!, text };
  return flagsOf(app, checkInput(app, d, false), d).filter((f) => f.end > f.start && !f.fine).length;
}

export function styleFor(app: App): number {
  const input = checkInput(app);
  const words = countWords(input.sections.map((s) => s.text).join('\n\n'));
  return styleScore(weightedTotal(flagsOf(app, input, app.draft!)), words);
}

// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Two-minute drills from data/drills.json: the learner rewrites one bad line
// and the real checks clear as they go. The app never shows a right answer;
// the learner types every word.

import raw from '../../data/drills.json';
import relationships from '../../data/relationships.json';
import { activeFlags, CHECK_INFO, runChecks } from '../checks';
import type { CId } from '../checks/cs';
import type { Flag } from '../checks/types';
import type { Prep } from '../drafts/model';
import { readJson, writeJson } from '../storage/store';
import type { Section } from '../types/schema';
import type { WordLists } from '../wordlists/load';

export interface DrillSet { id: string; title: string; c: CId; blurb: string; lines: string[] }

export const DRILL_SETS = (raw as { sets: DrillSet[] }).sets;

const DONE_FILE = 'settings/drills.json';
const BOX: Section = { id: 'drill', label: 'Your version', role: 'body', optional: false, tip: '', good: '', bad: '', targetWords: [0, 9999], phrases: [], profileFields: [] };
const NO_PLAN = { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' } as unknown as Prep;

/** Spots on the words themselves, from the checks the user has on. */
export function drillSpots(text: string, lists: WordLists, disabled: readonly string[] = []): Flag[] {
  const flags = runChecks({ sections: [{ section: BOX, text }], allSections: [BOX], prep: NO_PLAN, lists, relationships: relationships as never });
  return activeFlags(flags, disabled).filter((f) => f.end > f.start);
}

export interface SpotRow { label: string; cleared: boolean }

const spotId = (f: Flag) => `${f.check}|${f.text.trim().toLowerCase()}`;
const spotLabel = (f: Flag) => `${CHECK_INFO[f.check]?.label ?? f.check}: “${f.text}”`;

/** The bad line's spots, ticked off as they go, plus any new one the rewrite brings in. */
export function spotRows(start: Flag[], now: Flag[]): SpotRow[] {
  const open = new Set(now.map(spotId));
  const first = new Set(start.map(spotId));
  const seen = new Set<string>();
  const once = (f: Flag) => !seen.has(spotId(f)) && !!seen.add(spotId(f));
  return [
    ...start.filter(once).map((f) => ({ label: spotLabel(f), cleared: !open.has(spotId(f)) })),
    ...now.filter((f) => !first.has(spotId(f))).filter(once).map((f) => ({ label: spotLabel(f), cleared: false })),
  ];
}

/** Done when every spot is clear and the box holds a real rewrite. */
export function drillClear(rows: SpotRow[], text: string, line: string): boolean {
  return rows.every((r) => r.cleared) && text.trim().split(/\s+/).length >= 2 && text.trim() !== line.trim();
}

export const drillId = (set: DrillSet, i: number) => `${set.id}:${i}`;

export async function loadDoneDrills(): Promise<Set<string>> {
  const saved = await readJson<{ done?: unknown }>(DONE_FILE);
  return new Set(Array.isArray(saved?.done) ? saved.done.filter((d): d is string => typeof d === 'string') : []);
}

export function saveDoneDrills(done: Set<string>): Promise<void> {
  return writeJson(DONE_FILE, { done: [...done] });
}

export const doneIn = (set: DrillSet, done: Set<string>) => set.lines.filter((_, i) => done.has(drillId(set, i))).length;

/** The first line not done yet, or -1 when the set is finished. */
export const nextLine = (set: DrillSet, done: Set<string>) => set.lines.findIndex((_, i) => !done.has(drillId(set, i)));

export function recommendSet(done: Set<string>, focus: CId | null): DrillSet | undefined {
  const open = DRILL_SETS.filter((s) => nextLine(s, done) >= 0);
  return open.find((s) => s.c === focus) ?? open[0];
}

export const setForC = (c: CId) => DRILL_SETS.find((s) => s.c === c);

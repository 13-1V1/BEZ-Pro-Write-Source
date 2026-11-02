// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Practice mode: short made-up situations from data/practice.json. A scenario
// fills in the Plan only (reader, goal, key facts, deadline) — the learner
// still writes every word. Levels unlock as pieces are finished.

import raw from '../../data/practice.json';
import { C_IDS, type CId } from '../checks/cs';
import { newDraft, RELATIONSHIPS, type Draft, type Relationship } from '../drafts/model';
import type { ProgressRecord } from '../progress/progress';

export interface Scenario {
  id: string;
  level: number;
  title: string;
  typeId: string;
  topicId: string | null;
  situation: string;
  readerName: string;
  readerRole: string;
  relationship: Relationship | '';
  goal: string;
  facts: string;
  deadline: string;
  focus: CId;
}

/** Finished practice pieces needed at one level to open the next. */
export const TO_UNLOCK = 2;

const str = (v: unknown) => (typeof v === 'string' ? v : '');

function load(): Scenario[] {
  const list = (raw as { scenarios?: unknown[] }).scenarios ?? [];
  return list.flatMap((v) => {
    const s = v as Record<string, unknown>;
    if (!str(s.id) || !str(s.title) || !str(s.typeId) || !str(s.situation) || typeof s.level !== 'number') return [];
    const rel = RELATIONSHIPS.includes(s.relationship as Relationship) ? (s.relationship as Relationship) : '';
    const focus = C_IDS.includes(s.focus as CId) ? (s.focus as CId) : 'clear';
    return [{
      id: str(s.id), level: s.level, title: str(s.title), typeId: str(s.typeId), topicId: str(s.topicId) || null,
      situation: str(s.situation), readerName: str(s.readerName), readerRole: str(s.readerRole), relationship: rel,
      goal: str(s.goal), facts: str(s.facts), deadline: str(s.deadline), focus,
    }];
  });
}

export const SCENARIOS: Scenario[] = load();

export function scenarioById(id: string | undefined): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** Practice scenarios finished at least once. */
export function finishedIds(records: ProgressRecord[]): Set<string> {
  return new Set(records.map((r) => r.practiceId).filter((x): x is string => !!x));
}

/** Highest level open: level 1 always; each next level after TO_UNLOCK finished at the one below. */
export function unlockedLevel(records: ProgressRecord[], scenarios = SCENARIOS): number {
  const done = finishedIds(records);
  const top = Math.max(1, ...scenarios.map((s) => s.level));
  let level = 1;
  while (level < top && scenarios.filter((s) => s.level === level && done.has(s.id)).length >= TO_UNLOCK) level++;
  return level;
}

/**
 * What to try next: an unfinished scenario at the highest open level, preferring
 * one that works the C the learner struggles with most.
 */
export function recommend(records: ProgressRecord[], focus: CId | null, scenarios = SCENARIOS): Scenario | undefined {
  const done = finishedIds(records);
  const open = unlockedLevel(records, scenarios);
  for (let level = open; level >= 1; level--) {
    const fresh = scenarios.filter((s) => s.level === level && !done.has(s.id));
    if (fresh.length) return fresh.find((s) => s.focus === focus) ?? fresh[0];
  }
  return undefined;
}

/** A new draft for a scenario: the Plan is filled from the situation; the writing starts empty. */
export function practiceDraft(s: Scenario): Draft {
  const d = newDraft();
  d.typeId = s.typeId;
  d.topicId = s.topicId;
  d.practiceId = s.id;
  d.prep = { readerName: s.readerName, readerRole: s.readerRole, relationship: s.relationship, goal: s.goal, facts: s.facts, deadline: s.deadline };
  d.title = `Practice · ${s.title}`;
  d.titleCustom = true;
  d.stepKey = 'prep';
  return d;
}

// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// What one piece of writing in progress looks like on disk.

import { TAG_ROLES, type TagRole } from '../checks/tagged';

export const RELATIONSHIPS = ['boss', 'coworker', 'customer', 'stranger', 'teacher'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export interface Prep {
  readerName: string;
  readerRole: string;
  relationship: Relationship | '';
  goal: string;
  facts: string;
  deadline: string;
}

export type Answer = 'yes' | 'no';

export interface Draft {
  id: string;
  title: string;
  /** True once the user renames it, so the auto title stops updating. */
  titleCustom: boolean;
  created: number;
  saved: number;
  stepKey: string;
  typeId: string | null;
  topicId: string | null;
  profileId: string | null;
  prep: Prep;
  text: Record<string, string>;
  /** Framework answers per section, e.g. parts.skills.situation. Joined into text. */
  parts: Record<string, Record<string, string>>;
  skipped: Record<string, boolean>;
  /** Sections already filled from the profile, so clearing one doesn't refill it. */
  profileFilled: Record<string, boolean>;
  checklist: Record<string, Record<number, Answer>>;
  /** Spots the user looked at and marked "This one's fine" (keys from flagKey). */
  fine: string[];
  /** Check something I wrote: paragraph number → the part it is, so those checks run. */
  tags: Record<string, TagRole>;
  /** Set when this draft is a practice exercise (see data/practice.json). */
  practiceId?: string;
}

export function newDraft(): Draft {
  const now = Date.now();
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New writing',
    titleCustom: false,
    created: now,
    saved: 0,
    stepKey: 'type',
    typeId: null,
    topicId: null,
    profileId: null,
    prep: { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' },
    text: {},
    parts: {},
    skipped: {},
    profileFilled: {},
    checklist: {},
    fine: [],
    tags: {},
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Keep only the entries whose values pass `keep`. */
function only<T>(v: unknown, keep: (x: unknown) => x is T): Record<string, T> {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => keep(x))) as Record<string, T>;
}
const isStr = (x: unknown): x is string => typeof x === 'string';
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const isAnswer = (x: unknown): x is Answer => x === 'yes' || x === 'no';

/**
 * Fill in fields an older or hand-edited draft file may be missing, and replace
 * any field with the wrong shape (e.g. "text": "oops") with an empty one, so a
 * damaged file can never swallow what the user types.
 */
export function normalizeDraft(raw: Partial<Draft>): Draft {
  const base = newDraft();
  const r = (isObj(raw) ? raw : {}) as Record<string, unknown>;
  const str = (k: string, fallback: string) => (isStr(r[k]) ? (r[k] as string) : fallback);
  const num = (k: string, fallback: number) => (typeof r[k] === 'number' && Number.isFinite(r[k]) ? (r[k] as number) : fallback);
  const strOrNull = (k: string) => (isStr(r[k]) ? (r[k] as string) : null);
  const prep = only(r.prep, isStr);
  const relationship = RELATIONSHIPS.includes(prep.relationship as Relationship) ? (prep.relationship as Relationship) : '';
  return {
    id: str('id', base.id),
    title: str('title', base.title),
    titleCustom: r.titleCustom === true,
    created: num('created', base.created),
    saved: num('saved', 0),
    stepKey: str('stepKey', 'type'),
    typeId: strOrNull('typeId'),
    topicId: strOrNull('topicId'),
    profileId: strOrNull('profileId'),
    ...(isStr(r.practiceId) ? { practiceId: r.practiceId as string } : {}),
    prep: { ...base.prep, ...prep, relationship },
    text: only(r.text, isStr),
    parts: Object.fromEntries(Object.entries(only(r.parts, isObj)).map(([k, v]) => [k, only(v, isStr)])),
    skipped: only(r.skipped, isBool),
    profileFilled: only(r.profileFilled, isBool),
    checklist: Object.fromEntries(
      Object.entries(only(r.checklist, isObj)).map(([k, v]) => [k, only(v, isAnswer) as Record<number, Answer>]),
    ),
    fine: Array.isArray(r.fine) ? r.fine.filter(isStr) : [],
    tags: only(r.tags, (x): x is TagRole => TAG_ROLES.includes(x as TagRole)),
  };
}

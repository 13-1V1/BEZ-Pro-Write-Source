// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Check a parsed type file and explain problems in plain words.
// Returns a cleaned WritingType (defaults filled in) or a list of problems.

import { FRAMEWORKS } from '../frameworks/frameworks';
import { READING_TARGET_MAX, READING_TARGET_MIN } from '../prefs/prefs';
import { PROFILE_FIELDS, ROLES, type Section, type Topic, type WritingType } from './schema';

export type Checked<T> = { ok: true; value: T } | { ok: false; problems: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isRange = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && n >= 0) && v[0] <= v[1];

export function validateType(raw: unknown): Checked<WritingType> {
  const p: string[] = [];
  if (!isObj(raw)) return { ok: false, problems: ['The file should be one { … } object.'] };

  const need = (key: string, test: (v: unknown) => boolean, what: string, where = '') => {
    if (!test(raw[key])) p.push(`${where}"${key}" is missing or isn't ${what}.`);
  };
  need('id', (v) => isStr(v) && /^[a-z0-9-]+$/.test(v), 'a short id (lowercase letters, numbers, dashes)');
  need('name', isStr, 'text');
  need('useWhen', isStr, 'text');
  // Same range as the Settings slider, so the two never disagree.
  if (raw.readingTarget !== undefined && !(typeof raw.readingTarget === 'number' && raw.readingTarget >= READING_TARGET_MIN && raw.readingTarget <= READING_TARGET_MAX))
    p.push(`"readingTarget" should be a number from ${READING_TARGET_MIN} to ${READING_TARGET_MAX}, like 60.`);
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) p.push('"sections" is missing or empty.');

  const sections: Section[] = [];
  const ids = new Set<string>();
  (Array.isArray(raw.sections) ? raw.sections : []).forEach((s: unknown, i: number) => {
    const at = `Section ${i + 1}: `;
    if (!isObj(s)) return p.push(`${at}should be a { … } object.`);
    const sp: string[] = [];
    if (!isStr(s.id) || !s.id) sp.push(`${at}"id" is missing.`);
    else if (ids.has(s.id)) sp.push(`${at}id "${s.id}" is used twice.`);
    if (!isStr(s.label)) sp.push(`${at}"label" is missing.`);
    if (!ROLES.includes(s.role as never)) sp.push(`${at}"role" must be one of: ${ROLES.join(', ')}.`);
    for (const k of ['tip', 'good', 'bad'] as const) if (!isStr(s[k])) sp.push(`${at}"${k}" is missing or isn't text.`);
    if (s.targetWords !== undefined && !isRange(s.targetWords)) sp.push(`${at}"targetWords" should look like [15, 40].`);
    if (s.phrases !== undefined && !isStrList(s.phrases)) sp.push(`${at}"phrases" should be a list of text.`);
    if (s.framework !== undefined && !(isStr(s.framework) && FRAMEWORKS[s.framework]))
      sp.push(`${at}"framework" must be one of: ${Object.keys(FRAMEWORKS).join(', ')}.`);
    if (s.profileFields !== undefined && !(isStrList(s.profileFields) && s.profileFields.every((f) => PROFILE_FIELDS.includes(f as never))))
      sp.push(`${at}"profileFields" can only use: ${PROFILE_FIELDS.join(', ')}.`);
    if (sp.length) return p.push(...sp);
    ids.add(s.id as string);
    sections.push({
      id: s.id as string,
      label: s.label as string,
      role: s.role as Section['role'],
      optional: s.optional === true,
      what: isStr(s.what) ? s.what : undefined,
      tip: s.tip as string,
      good: s.good as string,
      bad: s.bad as string,
      targetWords: (s.targetWords as [number, number]) ?? [1, 200],
      phrases: (s.phrases as string[]) ?? [],
      // Fill order is fixed by the brief, whatever order the file lists them in.
      profileFields: PROFILE_FIELDS.filter((f) => ((s.profileFields as string[]) ?? []).includes(f)),
      prefix: isStr(s.prefix) ? s.prefix : undefined,
      gapBefore: typeof s.gapBefore === 'number' ? s.gapBefore : undefined,
      framework: isStr(s.framework) ? s.framework : undefined,
    });
  });

  const topics: Topic[] = [];
  const topicIds = new Set<string>();
  if (raw.topics !== undefined && !Array.isArray(raw.topics)) p.push('"topics" should be a list.');
  (Array.isArray(raw.topics) ? raw.topics : []).forEach((t: unknown, i: number) => {
    const at = `Topic ${i + 1}: `;
    if (!isObj(t)) return p.push(`${at}should be a { … } object.`);
    const tp: string[] = [];
    if (!isStr(t.id) || !t.id) tp.push(`${at}"id" is missing.`);
    else if (topicIds.has(t.id)) tp.push(`${at}id "${t.id}" is used twice.`);
    if (!isStr(t.name)) tp.push(`${at}"name" is missing.`);
    if (!isStr(t.tone)) tp.push(`${at}"tone" is missing.`);
    if (!isStrList(t.dos)) tp.push(`${at}"dos" should be a list of text.`);
    if (!isStrList(t.donts)) tp.push(`${at}"donts" should be a list of text.`);
    if (t.sectionOverrides !== undefined) {
      if (!isObj(t.sectionOverrides)) tp.push(`${at}"sectionOverrides" should be a { … } object.`);
      else
        for (const [key, o] of Object.entries(t.sectionOverrides)) {
          if (!ids.has(key)) tp.push(`${at}"sectionOverrides" names section "${key}", which this type doesn't have.`);
          if (!isObj(o)) { tp.push(`${at}section "${key}" override should be a { … } object.`); continue; }
          const w = `${at}section "${key}": `;
          // Same field checks as a section, for the fields the override names.
          for (const k of ['label', 'what', 'tip', 'good', 'bad', 'prefix'] as const) if (o[k] !== undefined && !isStr(o[k])) tp.push(`${w}"${k}" isn't text.`);
          if (o.targetWords !== undefined && !isRange(o.targetWords)) tp.push(`${w}"targetWords" should look like [15, 40].`);
          if (o.phrases !== undefined && !isStrList(o.phrases)) tp.push(`${w}"phrases" should be a list of text.`);
          if (o.profileFields !== undefined && !(isStrList(o.profileFields) && o.profileFields.every((f) => PROFILE_FIELDS.includes(f as never))))
            tp.push(`${w}"profileFields" can only use: ${PROFILE_FIELDS.join(', ')}.`);
          if (o.gapBefore !== undefined && typeof o.gapBefore !== 'number') tp.push(`${w}"gapBefore" should be a number.`);
          if (o.framework !== undefined && !(isStr(o.framework) && FRAMEWORKS[o.framework])) tp.push(`${at}section "${key}" uses unknown framework "${String(o.framework)}".`);
          if (o.profileFields !== undefined && isStrList(o.profileFields)) o.profileFields = PROFILE_FIELDS.filter((f) => (o.profileFields as string[]).includes(f));
        }
    }
    if (tp.length) return p.push(...tp);
    topicIds.add(t.id as string);
    topics.push(t as unknown as Topic);
  });

  if (p.length) return { ok: false, problems: p };
  return {
    ok: true,
    value: {
      id: raw.id as string,
      name: raw.name as string,
      useWhen: raw.useWhen as string,
      order: typeof raw.order === 'number' ? raw.order : 100,
      hidden: raw.hidden === true,
      readingTarget: (raw.readingTarget as number) ?? 60,
      sections,
      topics,
    },
  };
}

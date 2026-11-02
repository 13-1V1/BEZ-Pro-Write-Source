// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The app follows its own advice: every good example, phrase idea, tip, and
// explanation passes the app's own 7 C's checks. Words inside quotes are
// examples of what NOT to write, so they're left out.

import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import relationships from '../data/relationships.json';
import checksJson from '../data/checks.json';
import frameworks from '../data/frameworks.json';
import practice from '../data/practice.json';
import lessons from '../data/lessons.json';
import { runChecks } from '../src/checks';
import { CS } from '../src/checks/cs';
import type { Prep } from '../src/drafts/model';
import { sectionsFor } from '../src/types/merge';
import type { Section, WritingType } from '../src/types/schema';
import { defaultLists } from '../src/wordlists/load';

const lists = defaultLists();
const prep = { readerName: '', readerRole: '', relationship: '', goal: '', facts: '', deadline: '' } as unknown as Prep;
const ignore = new Set(['no-transition', 'no-ask', 'missing-fact', 'missing-reader', 'missing-deadline', 'no-polite-close']);
const run = (sections: { section: Section; text: string }[], all: Section[]) =>
  runChecks({ sections, allSections: all, prep, lists, relationships: relationships as never, spell: {} });
const body: Section = { id: 'b', label: 'Body', role: 'body', optional: false, tip: '', good: '', bad: '', targetWords: [0, 9999], phrases: [], profileFields: [] };

it('teaching text passes its own checks', () => {
  const out = new Set<string>();
  const teach: [string, string][] = [];
  const dir = new URL('../data/types/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as WritingType;
    teach.push([`${t.id}.useWhen`, t.useWhen]);
    for (const topic of [undefined, ...t.topics]) {
      const secs = sectionsFor(t, topic);
      const tag = `${t.id}/${topic?.id ?? '-'}`;
      for (const fl of run(secs.filter((s) => s.good.trim()).map((s) => ({ section: s, text: s.good })), secs))
        if (!ignore.has(fl.check)) out.add(`GOOD   ${tag}/${fl.sectionId}  ${fl.check}  "${fl.text.slice(0, 50)}"`);
      for (const s of secs) for (const p of s.phrases) for (const fl of run([{ section: s, text: p.replace(/\[[^\]]*\]/g, 'Sam') }], [s]))
        if (!ignore.has(fl.check) && fl.check !== 'length') out.add(`PHRASE ${tag}/${s.id}  ${fl.check}  "${fl.text}"  in "${p}"`);
      if (topic) teach.push([`${tag}.tone`, topic.tone], ...topic.dos.map((d) => [`${tag}.do`, d] as [string, string]));
      for (const s of secs) teach.push([`${tag}/${s.id}.tip`, s.tip], [`${tag}/${s.id}.what`, s.what ?? '']);
    }
  }
  for (const [k, v] of Object.entries(checksJson as Record<string, { why?: string; try?: string }>)) teach.push([`checks.${k}.why`, v.why ?? ''], [`checks.${k}.try`, v.try ?? '']);
  for (const c of Object.values(CS)) teach.push([`cs.${c.id}.def`, c.definition], ...c.questions.map((q) => [`cs.${c.id}.q`, q] as [string, string]), ...c.reminders.map((q) => [`cs.${c.id}.rem`, q] as [string, string]));
  for (const [k, v] of Object.entries(relationships as unknown as Record<string, { tip?: string }>)) if (v.tip) teach.push([`rel.${k}`, v.tip]);
  const walk = (o: unknown, p: string) => {
    if (typeof o === 'string') { if (!/\.(bad|_\w+)$/.test(p) && o.split(' ').length > 2) teach.push([`fw${p}`, o]); }
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
  };
  walk(frameworks, '');
  walk(lessons.lessons, '.lessons');
  for (const s of practice.scenarios) teach.push([`practice.${s.id}`, s.situation]);
  for (const [where, txt] of teach) {
    if (!txt) continue;
    // Words inside quotes are examples of what NOT to write; blank them out.
    const plain = txt.replace(/"[^"]*"|“[^”]*”/g, (m) => ' '.repeat(m.length));
    for (const fl of run([{ section: body, text: plain }], [body])) if (!ignore.has(fl.check)) out.add(`TEACH  ${where}  ${fl.check}  "${fl.text}"  in "${txt.slice(0, 80)}"`);
  }
  // Blanking out a quote can leave a lowercase start ("… or tomorrow"); that's not a real flag.
  expect([...out].filter((x) => !x.includes('  capital-start  ')).sort()).toEqual([]);
});

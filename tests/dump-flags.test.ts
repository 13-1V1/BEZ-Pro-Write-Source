// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Prints every flag on the problem sample, for eyeballing false alarms.
// Run: npx vitest run tests/dump-flags.test.ts

import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import email from '../data/types/email.json';
import relationships from '../data/relationships.json';
import { runChecks } from '../src/checks';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';

it('dump', () => {
  const v = validateType(email);
  if (!v.ok) throw new Error('bad type');
  const raw = readFileSync(new URL('./samples/problems-email.txt', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const text: Record<string, string> = {};
  for (const b of raw.split(/^## /m).slice(1)) { const [id, ...r] = b.split('\n'); text[id.trim()] = r.join('\n').trim(); }
  const flags = runChecks({
    sections: v.value.sections.filter((s) => text[s.id]).map((section) => ({ section, text: text[section.id] })),
    allSections: v.value.sections,
    prep: { readerName: 'Ms. Alvarez', readerRole: '', relationship: 'boss', goal: '', facts: 'Unit 4B', deadline: 'Friday, Nov 6' },
    lists: defaultLists(),
    relationships: relationships as never,
    spell: {},
  });
  console.log(flags.map((f) => `${f.c.padEnd(9)} ${f.check.padEnd(17)} ${String(f.sectionId).padEnd(9)} "${f.text.slice(0, 50)}"${f.use ? ` -> ${f.use}` : ''}`).join('\n'));
});

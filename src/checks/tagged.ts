// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Check something I wrote is one big box, so the greeting, Ask, and closing
// checks had nothing to run on. When the user marks a paragraph as one of
// those, it becomes its own part for the checks. Every part keeps the whole
// text with the other paragraphs blanked to spaces, so each flag's position
// still points at the right words in the one box.

import { paragraphs } from './text';
import type { CheckSection, Flag } from './types';
import type { Role, Section } from '../types/schema';

export const TAG_ROLES = ['greeting', 'ask', 'closing'] as const;
export type TagRole = (typeof TAG_ROLES)[number];

const LABELS: Record<TagRole, string> = { greeting: 'Greeting', ask: 'Ask', closing: 'Closing' };

/** Keep the characters `keep` says to; everything else becomes a space (line breaks stay, so paragraphs do too). */
function only(text: string, keep: (i: number) => boolean): string {
  let out = '';
  for (let i = 0; i < text.length; i++) out += keep(i) || text[i] === '\n' ? text[i] : ' ';
  return out;
}

/**
 * Split one box into parts by the user's tags (paragraph index → role).
 * Untagged paragraphs stay together as the body. Returns the parts to check
 * and the section list the checks should treat as the type's sections.
 */
export function taggedSections(base: Section, text: string, tags: Record<string, TagRole>): { sections: CheckSection[]; all: Section[] } {
  const paras = paragraphs(text);
  const roleOf = (i: number): Role => tags[String(i)] ?? 'body';
  const inPara = (pos: number) => paras.findIndex((p) => pos >= p.start && pos < p.end);
  const sections: CheckSection[] = [];
  const all: Section[] = [];
  for (const role of ['greeting', 'body', 'ask', 'closing'] as Role[]) {
    const mine = new Set(paras.map((_, i) => i).filter((i) => roleOf(i) === role));
    if (role !== 'body' && mine.size === 0) continue;
    const id = role === 'body' ? base.id : `${base.id}~${role}`;
    const section: Section = { ...base, id, role, label: role === 'body' ? base.label : LABELS[role as TagRole], optional: role !== 'body' };
    all.push(section);
    const part = only(text, (pos) => mine.has(inPara(pos)));
    if (part.trim()) sections.push({ section, text: part });
  }
  return { sections, all };
}

/**
 * Point flags from the split parts back at the one box: the part id becomes the
 * box id, and a flag over a whole part (an Ask with no request) shrinks to that
 * part's own paragraph instead of covering the blanked-out rest.
 */
export function backToBox(flags: Flag[], baseId: string, sections: CheckSection[]): Flag[] {
  const prefix = `${baseId}~`;
  return flags.map((f) => {
    if (!f.sectionId?.startsWith(prefix)) return f;
    const part = sections.find((s) => s.section.id === f.sectionId)?.text ?? '';
    const first = part.search(/\S/);
    const last = part.trimEnd().length;
    const start = f.end > f.start ? Math.max(f.start, first) : f.start;
    const end = f.end > f.start ? Math.min(f.end, last) : f.end;
    return { ...f, sectionId: baseId, start, end, text: f.end > f.start ? part.slice(start, end) : f.text };
  });
}
